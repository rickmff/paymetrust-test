import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import {
  failedTransaction,
  paidTransaction,
  pendingTransaction,
  transactions,
} from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { server } from "@/test/server";

// Integration tests: the real page, router and query layer, with a fake network.
// Each one reads like a requirement: given this API, when the user does X, they see Y.

/** Collects the query string of every list request the page makes. */
function recordListRequests(respond = () => transactions) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get("/api/transactions", ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ items: respond(), next_cursor: null });
    }),
  );
  return queries;
}

test("lists transactions with formatted amounts and readable statuses", async () => {
  renderApp("/transactions");

  const row = await screen.findByRole("row", { name: /PAY-1042/ });

  expect(within(row).getByText("15 000 F CFA")).toBeVisible();
  expect(within(row).getByText("Paid")).toBeVisible();
  expect(within(row).getByText("Wave")).toBeVisible();
  expect(screen.getByText("Showing 3 transactions")).toBeVisible();
});

test("shows an error and recovers on retry", async () => {
  server.use(
    http.get(
      "/api/transactions",
      () => new HttpResponse(null, { status: 500 }),
    ),
  );
  const { user } = renderApp("/transactions");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    /could not load transactions/i,
  );

  server.use(
    http.get("/api/transactions", () =>
      HttpResponse.json({ items: transactions, next_cursor: null }),
    ),
  );
  await user.click(screen.getByRole("button", { name: "Retry" }));

  expect(await screen.findByRole("row", { name: /PAY-1042/ })).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("filters by status: the choice goes to the URL and to the API", async () => {
  const queries = recordListRequests();
  const { user, router } = renderApp("/transactions");
  await screen.findByRole("row", { name: /PAY-1042/ });

  await user.click(screen.getByRole("button", { name: /status/i }));
  await user.click(screen.getByRole("option", { name: "Failed" }));

  await screen.findByRole("button", { name: /failed.*status/i });
  expect(router.state.location.search).toBe("?status=failed");
  expect(queries.at(-1)?.get("status")).toBe("failed");
});

test("restores the filters from the URL, so a shared link shows the same view", async () => {
  const queries = recordListRequests();
  renderApp("/transactions?status=failed&operator=orange_money");

  await screen.findByRole("row", { name: /PAY-1042/ });

  expect(Object.fromEntries(queries[0] ?? [])).toEqual({
    status: "failed",
    operator: "orange_money",
    sort: "-created_at",
  });
  expect(screen.getByRole("button", { name: /failed.*status/i })).toBeVisible();
});

test("ignores a filter value the URL should never have had", async () => {
  const queries = recordListRequests();
  renderApp("/transactions?status=banana");

  await screen.findByRole("row", { name: /PAY-1042/ });

  expect(queries[0]?.has("status")).toBe(false);
});

test("when no row matches the filters, offers to clear them", async () => {
  const queries = recordListRequests(() => []);
  const { user, router } = renderApp("/transactions?status=reversed");

  expect(
    await screen.findByText("No transactions match these filters"),
  ).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Clear filters" }));

  expect(await screen.findByText("No transactions yet")).toBeVisible();
  expect(router.state.location.search).toBe("");
  expect(queries.at(-1)?.has("status")).toBe(false);
});

test("sorts on the server: the choice goes to the URL and to the API", async () => {
  const queries = recordListRequests();
  const { user, router } = renderApp("/transactions");
  await screen.findByRole("row", { name: /PAY-1042/ });
  const header = (name: string) => screen.getByRole("columnheader", { name });

  // Newest first until the user asks for something else.
  expect(queries[0]?.get("sort")).toBe("-created_at");
  expect(header("Date")).toHaveAttribute("aria-sort", "descending");

  await user.click(header("Amount"));

  await waitFor(() => expect(queries.at(-1)?.get("sort")).toBe("amount"));
  expect(router.state.location.search).toBe("?sort=amount");
  expect(header("Amount")).toHaveAttribute("aria-sort", "ascending");
  expect(header("Date")).toHaveAttribute("aria-sort", "none");

  // The same header again turns the order around.
  await user.click(header("Amount"));

  await waitFor(() => expect(queries.at(-1)?.get("sort")).toBe("-amount"));
  expect(router.state.location.search).toBe("?sort=-amount");
});

test("restores the sort from the URL", async () => {
  const queries = recordListRequests();
  renderApp("/transactions?sort=-amount");

  await screen.findByRole("row", { name: /PAY-1042/ });

  expect(queries[0]?.get("sort")).toBe("-amount");
  expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
});

test("ignores a sort the URL should never have had", async () => {
  const queries = recordListRequests();
  renderApp("/transactions?sort=status");

  await screen.findByRole("row", { name: /PAY-1042/ });

  expect(queries[0]?.get("sort")).toBe("-created_at");
});

test("clearing the filters keeps the sort", async () => {
  recordListRequests(() => []);
  const { user, router } = renderApp(
    "/transactions?status=reversed&sort=-amount",
  );

  await user.click(
    await screen.findByRole("button", { name: "Clear filters" }),
  );

  expect(await screen.findByText("No transactions yet")).toBeVisible();
  expect(router.state.location.search).toBe("?sort=-amount");
});

test("loads the next page with the cursor the server gave", async () => {
  const cursors: (string | null)[] = [];
  server.use(
    http.get("/api/transactions", ({ request }) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      cursors.push(cursor);
      return HttpResponse.json(
        cursor === null
          ? { items: [paidTransaction], next_cursor: "after-1042" }
          : {
              items: [pendingTransaction, failedTransaction],
              next_cursor: null,
            },
      );
    }),
  );
  const { user } = renderApp("/transactions");
  await screen.findByRole("row", { name: /PAY-1042/ });
  expect(
    screen.queryByRole("row", { name: /PAY-1040/ }),
  ).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Load more" }));

  expect(await screen.findByRole("row", { name: /PAY-1040/ })).toBeVisible();
  expect(screen.getByRole("row", { name: /PAY-1042/ })).toBeVisible();
  expect(cursors).toEqual([null, "after-1042"]);
  // The last page has no cursor, so there is nothing more to load.
  expect(
    screen.queryByRole("button", { name: "Load more" }),
  ).not.toBeInTheDocument();
});
