import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { payouts, summary, transactions, users } from "./fixtures";

/** An error in the API's one error shape (see api/http.go). */
export function problem(
  status: number,
  code: string,
  detail: string,
  errors?: { field: string; message: string }[],
) {
  return HttpResponse.json(
    { title: code, status, code, detail, errors },
    { status },
  );
}

/**
 * The happy path of every GET. A test overrides only what it is about with
 * `server.use(...)`. Writes (POST) have no default on purpose: a test that
 * triggers one must say what the server answers.
 */
const handlers = [
  http.get("/api/me", () => HttpResponse.json(users.approver)),
  http.get("/api/summary", () => HttpResponse.json(summary)),
  http.get("/api/transactions", () =>
    HttpResponse.json({ items: transactions, next_cursor: null }),
  ),
  http.get("/api/transactions/:id", ({ params }) => {
    const found = transactions.find((t) => t.id === params.id);
    return found
      ? HttpResponse.json(found)
      : problem(
          404,
          "transaction_not_found",
          "This transaction does not exist.",
        );
  }),
  http.get("/api/payouts", () =>
    HttpResponse.json({ items: payouts, next_cursor: null }),
  ),
  http.get("/api/payouts/quote", ({ request }) => {
    const amount = Number(new URL(request.url).searchParams.get("amount"));
    const fee = Math.max(100, Math.round(amount / 100));
    return HttpResponse.json({
      amount,
      fee,
      total: amount + fee,
      currency: "XOF",
    });
  }),
];

export const server = setupServer(...handlers);
