package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"slices"
	"time"
)

// Requests go to stdout; real problems stay on stderr (the default logger).
var accessLog = log.New(os.Stdout, "", log.LstdFlags)

// problem is the single error shape of the API (RFC 9457 "problem details").
// The frontend parses it once, in src/lib/api.ts.
type problem struct {
	Title  string       `json:"title"`
	Status int          `json:"status"`
	Code   string       `json:"code"`             // stable, machine-readable
	Detail string       `json:"detail,omitempty"` // human-readable
	Errors []fieldError `json:"errors,omitempty"` // only on 422
}

type fieldError struct {
	Field   string `json:"field"` // same name as the request body field
	Message string `json:"message"`
}

// page is the envelope of every list. NextCursor is null on the last page.
type page[T any] struct {
	Items      []T     `json:"items"`
	NextCursor *string `json:"next_cursor"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}

func writeProblem(w http.ResponseWriter, status int, code, detail string, fields ...fieldError) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(problem{
		Title: http.StatusText(status), Status: status, Code: code, Detail: detail, Errors: fields,
	})
}

// readJSON decodes the body into v and answers 400 itself when the JSON is invalid.
// A float sent where the struct has an int64 (an amount) fails here: the type is the contract.
func readJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeProblem(w, http.StatusBadRequest, "invalid_json", "The request body is not valid JSON for this endpoint.")
		return false
	}
	return true
}

type userKey struct{}

func currentUser(r *http.Request) *User {
	return r.Context().Value(userKey{}).(*User)
}

// auth resolves the session cookie into a user, or answers 401.
func (a *app) auth(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := a.userForRequest(r)
		if user == nil {
			writeProblem(w, http.StatusUnauthorized, "unauthenticated", "Sign in to continue.")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), userKey{}, user)))
	})
}

// can is the source of truth for RBAC. Whatever the UI hides, the server still checks.
func (a *app) can(permission string, next http.HandlerFunc) http.Handler {
	return a.auth(func(w http.ResponseWriter, r *http.Request) {
		if !slices.Contains(currentUser(r).Permissions, permission) {
			writeProblem(w, http.StatusForbidden, "forbidden", "You don't have permission to do this.")
			return
		}
		next(w, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func (a *app) logged(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		time.Sleep(a.delay)
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		accessLog.Printf("%-4s %s -> %d (%s)", r.Method, r.URL.RequestURI(), rec.status, time.Since(start).Round(time.Millisecond))
	})
}
