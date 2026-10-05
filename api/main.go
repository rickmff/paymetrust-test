// Practice backend for the merchant console: Go standard library only, data in memory.
// It exists so the frontend talks to a real REST contract: status codes, cursor
// pagination, 422 field errors, idempotency keys and permissions enforced on the server.
package main

import (
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	addr := envOr("ADDR", "127.0.0.1:8080")
	delay, err := time.ParseDuration(envOr("API_DELAY", "0"))
	if err != nil {
		log.Fatalf("invalid API_DELAY: %v", err)
	}

	a := &app{
		store:      seed(time.Now().UTC().Truncate(time.Second)),
		testRoutes: os.Getenv("ENABLE_TEST_ROUTES") == "1",
		delay:      delay,
	}

	srv := &http.Server{Addr: addr, Handler: a.routes(), ReadHeaderTimeout: 5 * time.Second}
	accessLog.Printf("api listening on http://%s (test routes: %v, delay: %s)", addr, a.testRoutes, delay)
	log.Fatal(srv.ListenAndServe())
}

type app struct {
	*store
	testRoutes bool          // never enable in production: lets tests fake operator callbacks
	delay      time.Duration // artificial latency, so loading states are visible in dev
}

func (a *app) routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", a.health)
	mux.HandleFunc("POST /api/login", a.login)
	mux.HandleFunc("POST /api/logout", a.logout)
	mux.Handle("GET /api/me", a.auth(a.me))

	mux.Handle("GET /api/summary", a.can("transaction:read", a.summary))
	mux.Handle("GET /api/transactions", a.can("transaction:read", a.listTransactions))
	mux.Handle("GET /api/transactions/{id}", a.can("transaction:read", a.getTransaction))

	mux.Handle("GET /api/payouts", a.can("payout:read", a.listPayouts))
	mux.Handle("GET /api/payouts/quote", a.can("payout:create", a.quotePayout))
	mux.Handle("POST /api/payouts", a.can("payout:create", a.createPayout))
	mux.Handle("POST /api/payouts/{id}/approve", a.can("payout:approve", a.decidePayout(payoutApproved)))
	mux.Handle("POST /api/payouts/{id}/reject", a.can("payout:approve", a.decidePayout(payoutRejected)))

	if a.testRoutes {
		mux.HandleFunc("POST /api/test/transactions", a.testCreateTransaction)
		mux.HandleFunc("POST /api/test/transactions/{id}/settle", a.testSettleTransaction)
	}

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeProblem(w, http.StatusNotFound, "not_found", "No such endpoint.")
	})

	return a.logged(mux)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
