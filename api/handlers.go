package main

import (
	"cmp"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

func (a *app) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ---- session ---------------------------------------------------------------

const sessionCookie = "session"

func (a *app) userForRequest(r *http.Request) *User {
	cookie, err := r.Cookie(sessionCookie)
	if err != nil {
		return nil
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.users[a.sessions[cookie.Value]]
}

func (a *app) login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !readJSON(w, r, &in) {
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	user := a.users[strings.ToLower(strings.TrimSpace(in.Email))]
	if user == nil || user.password != in.Password {
		// Same answer for "unknown email" and "wrong password": don't reveal which accounts exist.
		writeProblem(w, http.StatusUnauthorized, "invalid_credentials", "Wrong email or password.")
		return
	}

	token := make([]byte, 32)
	rand.Read(token)
	session := hex.EncodeToString(token)
	a.sessions[session] = user.Email

	// HttpOnly: JavaScript can't read it, so XSS can't steal the session.
	// SameSite=Lax: other sites can't send it on a POST (CSRF). Add Secure behind HTTPS.
	http.SetCookie(w, &http.Cookie{
		Name: sessionCookie, Value: session, Path: "/",
		HttpOnly: true, SameSite: http.SameSiteLaxMode, MaxAge: 8 * 60 * 60,
	})
	writeJSON(w, http.StatusOK, user)
}

func (a *app) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookie); err == nil {
		a.mu.Lock()
		delete(a.sessions, cookie.Value)
		a.mu.Unlock()
	}
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Path: "/", HttpOnly: true, MaxAge: -1})
	w.WriteHeader(http.StatusNoContent)
}

func (a *app) me(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, currentUser(r))
}

// ---- dashboard -------------------------------------------------------------

func (a *app) summary(w http.ResponseWriter, r *http.Request) {
	a.mu.Lock()
	defer a.mu.Unlock()

	counts := map[string]int{}
	for _, status := range transactionStatuses {
		counts[status] = 0 // always send every key: the frontend parses an exhaustive record
	}
	var collected int64
	for _, t := range a.transactions {
		counts[t.Status]++
		if t.Status == txSuccess {
			collected += t.Net
		}
	}

	finished := len(a.transactions) - counts[txPending]
	rate := 0.0
	if finished > 0 {
		rate = float64(counts[txSuccess]) / float64(finished)
	}

	pending := 0
	for _, p := range a.payouts {
		if p.Status == payoutPending {
			pending++
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"currency":                 currencyXOF,
		"collected":                collected,
		"success_rate":             rate, // a ratio may be a float; money may not
		"transactions":             counts,
		"payouts_pending_approval": pending,
	})
}

// ---- lists -----------------------------------------------------------------

// listing is how one list can be ordered. ?sort= takes field names separated
// by commas, each with "-" in front for descending: "-amount,created_at" is
// the biggest first and, among equal amounts, the oldest first. Each field is
// the value rows are ordered by. Every list can also be sorted by "id".
type listing[T any] struct {
	id          func(T) string
	sorts       map[string]func(T) int64
	defaultSort string
}

// ordering is a ?sort= that was read: the fields rows are compared by, first
// to last, and then the id. No two rows share an id, so the order is total
// and a page never starts in the middle of equal values.
type ordering[T any] struct {
	fields       []orderField[T]
	idDescending bool
}

type orderField[T any] struct {
	value      func(T) int64
	descending bool
}

func (l listing[T]) ordering(sort string) (o ordering[T], ok bool) {
	seen := map[string]bool{}
	for _, part := range strings.Split(sort, ",") {
		name, descending := strings.CutPrefix(part, "-")
		value, known := l.sorts[name]
		if seen[name] || !known && name != "id" {
			return o, false
		}
		seen[name] = true
		if seen["id"] && name != "id" {
			continue // after the id nothing ties, so this field can't change the order
		}
		// Unless the id is named, it goes the same way as the last field.
		o.idDescending = descending
		if known {
			o.fields = append(o.fields, orderField[T]{value, descending})
		}
	}
	return o, true
}

// turn reverses a comparison for a descending order.
func turn(c int, descending bool) int {
	if descending {
		return -c
	}
	return c
}

// The cursor is the sort key of the last row the client saw: its value for
// each field of the sort, then its id, and the sort it belongs to. Unlike an
// offset, it stays correct while new rows keep arriving.
func encodeCursor(sort string, values []int64, id string) string {
	texts := make([]string, len(values))
	for i, value := range values {
		texts[i] = strconv.FormatInt(value, 10)
	}
	return base64.RawURLEncoding.EncodeToString([]byte(sort + "|" + strings.Join(texts, ",") + "|" + id))
}

// A cursor made for another sort is not valid: it points into a different order.
func decodeCursor(cursor, sort string, fields int) (values []int64, id string, ok bool) {
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, "", false
	}
	parts := strings.SplitN(string(raw), "|", 3)
	if len(parts) != 3 || parts[0] != sort {
		return nil, "", false
	}
	if parts[1] != "" { // a sort by id alone has no values
		for _, text := range strings.Split(parts[1], ",") {
			value, err := strconv.ParseInt(text, 10, 64)
			if err != nil {
				return nil, "", false
			}
			values = append(values, value)
		}
	}
	return values, parts[2], len(values) == fields
}

// An id is a prefix and a counter, so the longer one is the newer one. As
// plain strings, "PAY-10000" would come before "PAY-9999".
func compareIDs(a, b string) int {
	return cmp.Or(cmp.Compare(len(a), len(b)), cmp.Compare(a, b))
}

// writePage answers a list request with one page of rows. The handler has
// already filtered them; ?sort=, ?cursor= and ?limit= are read here, the same
// way for every list.
func writePage[T any](w http.ResponseWriter, r *http.Request, list listing[T], rows []T) {
	q := r.URL.Query()

	limit := 10
	if raw := q.Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 50 {
			writeProblem(w, http.StatusBadRequest, "invalid_limit", "limit must be between 1 and 50.")
			return
		}
		limit = n
	}

	sort := cmp.Or(q.Get("sort"), list.defaultSort)
	order, ok := list.ordering(sort)
	if !ok {
		writeProblem(w, http.StatusBadRequest, "invalid_sort", "Unknown sort.")
		return
	}

	cursor := q.Get("cursor")
	afterValues, afterID, ok := decodeCursor(cursor, sort, len(order.fields))
	if cursor != "" && !ok {
		writeProblem(w, http.StatusBadRequest, "invalid_cursor", "The cursor is not valid.")
		return
	}

	// A database would do this with ORDER BY and an index. Here: skip, sort, cut.
	if cursor != "" {
		rows = slices.DeleteFunc(rows, func(row T) bool {
			// At or before the cursor: the client already has it.
			for i, field := range order.fields {
				if c := cmp.Compare(field.value(row), afterValues[i]); c != 0 {
					return turn(c, field.descending) < 0
				}
			}
			return turn(compareIDs(list.id(row), afterID), order.idDescending) <= 0
		})
	}
	// Field by field, then by id: each next one only decides between rows the
	// ones before it left equal.
	slices.SortFunc(rows, func(x, y T) int {
		for _, field := range order.fields {
			if c := cmp.Compare(field.value(x), field.value(y)); c != 0 {
				return turn(c, field.descending)
			}
		}
		return turn(compareIDs(list.id(x), list.id(y)), order.idDescending)
	})

	result := page[T]{Items: rows}
	if len(rows) > limit { // one more row exists, so there is a next page
		last := rows[limit-1]
		values := make([]int64, len(order.fields))
		for i, field := range order.fields {
			values[i] = field.value(last)
		}
		next := encodeCursor(sort, values, list.id(last))
		result.Items, result.NextCursor = rows[:limit], &next
	}
	writeJSON(w, http.StatusOK, result)
}

// ---- transactions ----------------------------------------------------------

var transactionList = listing[*Transaction]{
	id: func(t *Transaction) string { return t.ID },
	sorts: map[string]func(*Transaction) int64{
		"created_at": func(t *Transaction) int64 { return t.CreatedAt.UnixNano() },
		"amount":     func(t *Transaction) int64 { return t.Amount },
	},
	defaultSort: "-created_at", // newest first
}

func (a *app) listTransactions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status, operator := q.Get("status"), q.Get("operator")
	if status != "" && !slices.Contains(transactionStatuses, status) {
		writeProblem(w, http.StatusBadRequest, "invalid_filter", "Unknown status.")
		return
	}
	if _, known := operatorPrefixes[operator]; operator != "" && !known {
		writeProblem(w, http.StatusBadRequest, "invalid_filter", "Unknown operator.")
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	rows := make([]*Transaction, 0, len(a.transactions)) // never nil: nil encodes as null
	for _, t := range a.transactions {
		if status != "" && t.Status != status || operator != "" && t.Operator != operator {
			continue
		}
		rows = append(rows, t)
	}
	writePage(w, r, transactionList, rows)
}

func (a *app) findTransaction(id string) *Transaction {
	for _, t := range a.transactions {
		if t.ID == id {
			return t
		}
	}
	return nil
}

func (a *app) getTransaction(w http.ResponseWriter, r *http.Request) {
	a.mu.Lock()
	defer a.mu.Unlock()

	t := a.findTransaction(r.PathValue("id"))
	if t == nil {
		writeProblem(w, http.StatusNotFound, "transaction_not_found", "This transaction does not exist.")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// ---- payouts ---------------------------------------------------------------

const (
	payoutMin = 500
	payoutMax = 2_000_000
)

var phonePattern = regexp.MustCompile(`^\+225(01|05|07)\d{8}$`)

type createPayoutRequest struct {
	Amount         int64  `json:"amount"`
	Currency       string `json:"currency"`
	Operator       string `json:"operator"`
	RecipientName  string `json:"recipient_name"`
	RecipientPhone string `json:"recipient_phone"`
	Reference      string `json:"reference"`
}

// validate repeats the frontend's rules (the client is only UX) and adds the
// ones only the server can know, like whether the wallet exists.
func (in createPayoutRequest) validate() []fieldError {
	var errs []fieldError
	add := func(field, message string) { errs = append(errs, fieldError{field, message}) }

	if in.Currency != currencyXOF {
		add("currency", "Only XOF payouts are supported.")
	}
	if in.Amount < payoutMin || in.Amount > payoutMax {
		add("amount", fmt.Sprintf("Amount must be between %d and %d.", payoutMin, payoutMax))
	}
	if n := utf8.RuneCountInString(strings.TrimSpace(in.RecipientName)); n < 2 || n > 80 {
		add("recipient_name", "Enter the recipient's full name.")
	}
	if utf8.RuneCountInString(in.Reference) > 140 {
		add("reference", "Reference must be 140 characters or fewer.")
	}

	prefixes, knownOperator := operatorPrefixes[in.Operator]
	switch {
	case !knownOperator:
		add("operator", "Choose an operator.")
	case !phonePattern.MatchString(in.RecipientPhone):
		add("recipient_phone", "Use the format +225 07 00 00 00 00.")
	case !slices.Contains(prefixes, in.RecipientPhone[4:6]):
		add("recipient_phone", "This number does not belong to the selected operator.")
	case strings.HasSuffix(in.RecipientPhone, "0000"):
		// Stand-in for a real wallet lookup at the operator: only the server can answer this.
		add("recipient_phone", "No mobile money wallet was found for this number.")
	}
	return errs
}

func (a *app) quotePayout(w http.ResponseWriter, r *http.Request) {
	amount, err := strconv.ParseInt(r.URL.Query().Get("amount"), 10, 64)
	if err != nil || amount < payoutMin || amount > payoutMax {
		writeProblem(w, http.StatusBadRequest, "invalid_amount", "amount must be an integer within the payout limits.")
		return
	}
	fee := payoutFee(amount)
	writeJSON(w, http.StatusOK, map[string]any{"amount": amount, "fee": fee, "total": amount + fee, "currency": currencyXOF})
}

var payoutList = listing[*Payout]{
	id: func(p *Payout) string { return p.ID },
	sorts: map[string]func(*Payout) int64{
		"amount": func(p *Payout) int64 { return p.Amount },
	},
	// Ids count up, so "id" is the order of creation: newest first.
	defaultSort: "-id",
}

func (a *app) listPayouts(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status != "" && !slices.Contains(payoutStatuses, status) {
		writeProblem(w, http.StatusBadRequest, "invalid_filter", "Unknown status.")
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	rows := make([]*Payout, 0, len(a.payouts))
	for _, p := range a.payouts {
		if status == "" || p.Status == status {
			rows = append(rows, p)
		}
	}
	writePage(w, r, payoutList, rows)
}

func (a *app) findPayout(id string) *Payout {
	for _, p := range a.payouts {
		if p.ID == id {
			return p
		}
	}
	return nil
}

func (a *app) createPayout(w http.ResponseWriter, r *http.Request) {
	// The client creates the key once per payout attempt and resends it on every retry.
	// Same key twice = same payout back, never a second one.
	key := r.Header.Get("Idempotency-Key")
	if key == "" {
		writeProblem(w, http.StatusBadRequest, "idempotency_key_required", "Send an Idempotency-Key header.")
		return
	}

	var in createPayoutRequest
	if !readJSON(w, r, &in) {
		return
	}
	if errs := in.validate(); len(errs) > 0 {
		writeProblem(w, http.StatusUnprocessableEntity, "validation_failed", "Some fields need your attention.", errs...)
		return
	}

	user := currentUser(r)
	a.mu.Lock()
	defer a.mu.Unlock()

	scopedKey := user.ID + "|" + key
	if first, seen := a.idempotency[scopedKey]; seen {
		// A retry repeats the request. The same key with another body is not a
		// retry: answering with the first payout would confirm an amount or a
		// recipient this request never asked for.
		if first.request != in {
			writeProblem(w, http.StatusUnprocessableEntity, "idempotency_key_reused",
				"This Idempotency-Key was already used for a different payout.")
			return
		}
		w.Header().Set("Idempotent-Replayed", "true")
		writeJSON(w, http.StatusOK, a.findPayout(first.payoutID))
		return
	}

	payout := a.newPayout(in, user, time.Now().UTC().Truncate(time.Second))
	a.payouts = append([]*Payout{payout}, a.payouts...)
	a.idempotency[scopedKey] = idempotent{request: in, payoutID: payout.ID}
	writeJSON(w, http.StatusCreated, payout)
}

func (a *app) decidePayout(decision string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Reason string `json:"reason"`
		}
		if decision == payoutRejected {
			if !readJSON(w, r, &in) {
				return
			}
			in.Reason = strings.TrimSpace(in.Reason)
			if utf8.RuneCountInString(in.Reason) < 5 {
				writeProblem(w, http.StatusUnprocessableEntity, "validation_failed", "Some fields need your attention.",
					fieldError{"reason", "Explain the rejection in at least 5 characters."})
				return
			}
		}

		user := currentUser(r)
		a.mu.Lock()
		defer a.mu.Unlock()

		payout := a.findPayout(r.PathValue("id"))
		switch {
		case payout == nil:
			writeProblem(w, http.StatusNotFound, "payout_not_found", "This payout does not exist.")
		case payout.Status != payoutPending:
			// Two approvers clicked at the same time: the second one gets a conflict, not a double decision.
			writeProblem(w, http.StatusConflict, "already_decided",
				fmt.Sprintf("This payout was already %s by %s.", payout.Status, payout.DecidedBy.Name))
		case payout.CreatedBy.ID == user.ID:
			// Maker-checker: the person who created a payout can never be the one who decides it.
			writeProblem(w, http.StatusForbidden, "self_approval", "You can't decide a payout you created.")
		default:
			payout.decide(decision, in.Reason, user, time.Now().UTC().Truncate(time.Second))
			writeJSON(w, http.StatusOK, payout)
		}
	}
}

// ---- test-only routes (ENABLE_TEST_ROUTES=1) -------------------------------
// They play the mobile money operator, so E2E tests never wait for a real phone.

func (a *app) testCreateTransaction(w http.ResponseWriter, r *http.Request) {
	a.mu.Lock()
	defer a.mu.Unlock()

	t := a.newTransaction(25000, "wave", "+2250700000001", time.Now().UTC().Truncate(time.Second))
	a.transactions = append([]*Transaction{t}, a.transactions...)
	writeJSON(w, http.StatusCreated, t)
}

func (a *app) testSettleTransaction(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status string `json:"status"`
	}
	if !readJSON(w, r, &in) {
		return
	}
	if in.Status != txSuccess && in.Status != txFailed {
		writeProblem(w, http.StatusBadRequest, "invalid_status", "status must be success or failed.")
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	t := a.findTransaction(r.PathValue("id"))
	if t == nil || t.Status != txPending {
		writeProblem(w, http.StatusConflict, "not_pending", "Only a pending transaction can be settled.")
		return
	}
	t.settle(in.Status, "Customer did not confirm in time", time.Now().UTC().Truncate(time.Second))
	writeJSON(w, http.StatusOK, t)
}
