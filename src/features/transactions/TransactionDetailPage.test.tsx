import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, expect, test, vi } from "vitest";
import { pendingTransaction } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { server } from "@/test/server";

afterEach(() => {
  vi.useRealTimers();
});

test("shows amount, fee and net, and why a payment failed", async () => {
  renderApp("/transactions/PAY-1040");

  expect(
    await screen.findByRole("heading", { name: "PAY-1040" }),
  ).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Failed: Insufficient balance.",
  );
  expect(screen.getByText("5 000 F CFA")).toBeVisible(); // amount
  expect(screen.getByText("75 F CFA")).toBeVisible(); // fee
  expect(screen.getByText("4 925 F CFA")).toBeVisible(); // net
});

test("says so when the transaction does not exist, with nothing to retry", async () => {
  renderApp("/transactions/PAY-0000");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This transaction does not exist.",
  );
  // A 404 gives the same answer every time: no Retry button.
  expect(
    screen.queryByRole("button", { name: "Retry" }),
  ).not.toBeInTheDocument();
});

test("keeps asking the API while the payment is pending, and shows the result", async () => {
  // Fake only the timers the polling uses. `shouldAdvanceTime` keeps the clock
  // moving, so Testing Library's own waiting (findBy) still works.
  vi.useFakeTimers({ shouldAdvanceTime: true });

  let operatorAnswered = false;
  server.use(
    http.get("/api/transactions/PAY-1041", () =>
      HttpResponse.json(
        operatorAnswered
          ? {
              ...pendingTransaction,
              status: "success",
              settled_at: "2026-10-01T10:05:00Z",
            }
          : pendingTransaction,
      ),
    ),
  );
  renderApp("/transactions/PAY-1041");

  expect(
    await screen.findByText(
      "Waiting for the customer to confirm on their phone.",
    ),
  ).toBeVisible();

  // The customer confirms on their phone. Jump past the first polling delay
  // instead of really waiting two seconds.
  operatorAnswered = true;
  await vi.advanceTimersByTimeAsync(2_000);

  expect(await screen.findByText("Paid")).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent(/^Paid on /);
});
