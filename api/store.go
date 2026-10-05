package main

import (
	"fmt"
	"sync"
	"time"
)

// The JSON tags below are the contract. Each struct has a Zod schema on the
// frontend with the same field names (src/features/*/schemas.ts).

type User struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Email       string   `json:"email"`
	Role        string   `json:"role"`        // display only
	Permissions []string `json:"permissions"` // what the UI and the API actually check
	password    string
}

type UserRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Amounts are int64 in the currency's smallest unit. Never floats.
type Transaction struct {
	ID            string     `json:"id"`
	Amount        int64      `json:"amount"`
	Fee           int64      `json:"fee"`
	Net           int64      `json:"net"`
	Currency      string     `json:"currency"`
	Operator      string     `json:"operator"`
	CustomerPhone string     `json:"customer_phone"`
	Status        string     `json:"status"`
	FailureReason *string    `json:"failure_reason,omitempty"` // only when failed
	SettledAt     *time.Time `json:"settled_at,omitempty"`     // success and reversed
	ReversedAt    *time.Time `json:"reversed_at,omitempty"`    // only when reversed
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type Payout struct {
	ID             string     `json:"id"`
	Amount         int64      `json:"amount"`
	Fee            int64      `json:"fee"`
	Total          int64      `json:"total"`
	Currency       string     `json:"currency"`
	Operator       string     `json:"operator"`
	RecipientName  string     `json:"recipient_name"`
	RecipientPhone string     `json:"recipient_phone"`
	Reference      string     `json:"reference"`
	Status         string     `json:"status"`
	CreatedBy      UserRef    `json:"created_by"`
	DecidedBy      *UserRef   `json:"decided_by,omitempty"`      // approved and rejected
	DecidedAt      *time.Time `json:"decided_at,omitempty"`      // approved and rejected
	DecisionReason *string    `json:"decision_reason,omitempty"` // only when rejected
	CreatedAt      time.Time  `json:"created_at"`
}

const (
	currencyXOF = "XOF"

	txPending  = "pending"
	txSuccess  = "success"
	txFailed   = "failed"
	txReversed = "reversed"

	payoutPending  = "pending_approval"
	payoutApproved = "approved"
	payoutRejected = "rejected"
)

var (
	transactionStatuses = []string{txPending, txSuccess, txFailed, txReversed}
	payoutStatuses      = []string{payoutPending, payoutApproved, payoutRejected}

	// Operator -> mobile prefix in Côte d'Ivoire. Wave is not a carrier, so any prefix works.
	operatorPrefixes = map[string][]string{
		"orange_money": {"07"},
		"mtn_momo":     {"05"},
		"moov_money":   {"01"},
		"wave":         {"01", "05", "07"},
	}

	rolePermissions = map[string][]string{
		"viewer":   {"transaction:read", "payout:read"},
		"maker":    {"transaction:read", "payout:read", "payout:create"},
		"approver": {"transaction:read", "payout:read", "payout:create", "payout:approve"},
	}
)

type store struct {
	mu           sync.Mutex
	users        map[string]*User      // by email
	sessions     map[string]string     // session token -> email
	transactions []*Transaction        // newest first
	payouts      []*Payout             // newest first
	idempotency  map[string]idempotent // user id + key -> what the key was used for
	nextTxn      int
	nextPayout   int
}

// idempotent is what the API remembers about an Idempotency-Key: the request,
// to tell a retry from a key reused for something else, and the payout it made.
type idempotent struct {
	request  createPayoutRequest
	payoutID string
}

// collectionFee is 1.5%, rounded half up, in integer math.
func collectionFee(amount int64) int64 { return (amount*15 + 500) / 1000 }

// payoutFee is 1% with a floor of 100.
func payoutFee(amount int64) int64 { return max(100, (amount+50)/100) }

func (s *store) newTransaction(amount int64, operator, phone string, at time.Time) *Transaction {
	s.nextTxn++
	fee := collectionFee(amount)
	return &Transaction{
		ID: fmt.Sprintf("PAY-%d", s.nextTxn), Amount: amount, Fee: fee, Net: amount - fee,
		Currency: currencyXOF, Operator: operator, CustomerPhone: phone,
		Status: txPending, CreatedAt: at, UpdatedAt: at,
	}
}

// settle applies the operator's final answer to a pending transaction.
func (t *Transaction) settle(status, reason string, at time.Time) {
	t.Status, t.UpdatedAt = status, at
	switch status {
	case txSuccess:
		t.SettledAt = &at
	case txFailed:
		t.FailureReason = &reason
	case txReversed:
		settled := at.Add(-time.Hour)
		t.SettledAt, t.ReversedAt = &settled, &at
	}
}

func (s *store) newPayout(in createPayoutRequest, by *User, at time.Time) *Payout {
	s.nextPayout++
	fee := payoutFee(in.Amount)
	return &Payout{
		ID: fmt.Sprintf("PO-%d", s.nextPayout), Amount: in.Amount, Fee: fee, Total: in.Amount + fee,
		Currency: currencyXOF, Operator: in.Operator, RecipientName: in.RecipientName,
		RecipientPhone: in.RecipientPhone, Reference: in.Reference, Status: payoutPending,
		CreatedBy: UserRef{ID: by.ID, Name: by.Name}, CreatedAt: at,
	}
}

func (p *Payout) decide(status, reason string, by *User, at time.Time) {
	p.Status, p.DecidedBy, p.DecidedAt = status, &UserRef{ID: by.ID, Name: by.Name}, &at
	if status == payoutRejected {
		p.DecisionReason = &reason
	}
}

// seed builds a deterministic data set: same ids and statuses on every start.
func seed(now time.Time) *store {
	s := &store{
		users:       map[string]*User{},
		sessions:    map[string]string{},
		idempotency: map[string]idempotent{},
		nextTxn:     1000,
		nextPayout:  2000,
	}

	for _, u := range []User{
		{ID: "usr_viewer", Name: "Fatou Diallo", Email: "viewer@demo.test", Role: "viewer"},
		{ID: "usr_maker", Name: "Kofi Mensah", Email: "maker@demo.test", Role: "maker"},
		{ID: "usr_approver", Name: "Awa Koné", Email: "approver@demo.test", Role: "approver"},
	} {
		u.Permissions, u.password = rolePermissions[u.Role], "demo1234"
		s.users[u.Email] = &u
	}

	operators := []string{"orange_money", "mtn_momo", "wave", "moov_money"}
	amounts := []int64{5000, 12500, 2000, 75000, 30000, 1500, 250000, 10000}
	reasons := []string{"Insufficient balance", "Customer did not confirm in time", "Operator unavailable"}
	// Position 0 is the newest transaction, so the first page shows every status.
	pattern := []string{
		txSuccess, txPending, txSuccess, txFailed, txSuccess, txSuccess,
		txReversed, txSuccess, txSuccess, txFailed, txSuccess, txSuccess,
	}

	const total = 36
	for i := range total { // oldest first, so ids grow with time
		age := total - 1 - i
		created := now.Add(-time.Duration(age) * 17 * time.Minute)
		operator := operators[i%len(operators)]
		phone := fmt.Sprintf("+225%s%08d", operatorPrefixes[operator][0], 10_000_000+i*1_379_113%90_000_000)

		t := s.newTransaction(amounts[i%len(amounts)], operator, phone, created)
		if status := pattern[age%len(pattern)]; status != txPending {
			t.settle(status, reasons[i%len(reasons)], created.Add(2*time.Minute))
		}
		s.transactions = append([]*Transaction{t}, s.transactions...)
	}

	maker, approver := s.users["maker@demo.test"], s.users["approver@demo.test"]
	for i, p := range []struct {
		in     createPayoutRequest
		by     *User
		status string
		reason string
	}{
		{createPayoutRequest{Amount: 150000, Operator: "orange_money", RecipientName: "Ibrahim Traoré", RecipientPhone: "+2250701020304", Reference: "Invoice 0098"}, maker, payoutRejected, "Duplicate of an earlier payout"},
		{createPayoutRequest{Amount: 42000, Operator: "mtn_momo", RecipientName: "Mariam Ouattara", RecipientPhone: "+2250505060708", Reference: "Refund order 5521"}, maker, payoutApproved, ""},
		{createPayoutRequest{Amount: 9000, Operator: "wave", RecipientName: "Yao Kouassi", RecipientPhone: "+2250709080706", Reference: "Driver bonus"}, approver, payoutPending, ""},
		{createPayoutRequest{Amount: 60000, Operator: "moov_money", RecipientName: "Aminata Bamba", RecipientPhone: "+2250102030405", Reference: "Supplier, October"}, maker, payoutPending, ""},
	} {
		created := now.Add(-time.Duration(4-i) * 3 * time.Hour)
		payout := s.newPayout(p.in, p.by, created)
		if p.status != payoutPending {
			payout.decide(p.status, p.reason, approver, created.Add(40*time.Minute))
		}
		s.payouts = append([]*Payout{payout}, s.payouts...)
	}

	return s
}
