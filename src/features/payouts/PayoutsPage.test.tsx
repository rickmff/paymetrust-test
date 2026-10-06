import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import {
  approvedPayout,
  ownPayout,
  payouts,
  pendingPayout,
} from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { problem, server } from "@/test/server";

// Permissions: the same screen, rendered as different users.

test("given an approver, a payout created by someone else can be decided", async () => {
  renderApp("/payouts", { as: "approver" });

  expect(
    await screen.findByRole("button", { name: "Approve PO-2004" }),
  ).toBeEnabled();
  expect(screen.getByRole("button", { name: "Reject PO-2004" })).toBeEnabled();
});

test("given a viewer, no decision or creation action is shown", async () => {
  renderApp("/payouts", { as: "viewer" });
  await screen.findByRole("row", { name: /PO-2004/ });

  // queryBy: the right query to prove something is NOT there.
  expect(
    screen.queryByRole("button", { name: /approve/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("columnheader", { name: "Actions" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "New payout" }),
  ).not.toBeInTheDocument();
});

test("given a maker, a payout can be created but not decided", async () => {
  renderApp("/payouts", { as: "maker" });
  await screen.findByRole("row", { name: /PO-2004/ });

  expect(screen.getByRole("link", { name: "New payout" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /approve/i }),
  ).not.toBeInTheDocument();
});

test("the creator of a payout can't decide it, and is told why", async () => {
  renderApp("/payouts", { as: "approver" });

  const ownRow = await screen.findByRole("row", { name: /PO-2003/ });

  expect(
    within(ownRow).getByRole("button", { name: "Approve PO-2003" }),
  ).toBeDisabled();
  expect(
    within(ownRow).getByRole("button", { name: "Reject PO-2003" }),
  ).toBeDisabled();
  expect(within(ownRow).getByText(/you created this payout/i)).toBeVisible();
});

// The approval flow.

test("approving asks for confirmation and shows the result only after the server confirms", async () => {
  let approvals = 0;
  server.use(
    http.post("/api/payouts/PO-2004/approve", () => {
      approvals += 1;
      // From now on the list returns the payout as approved.
      server.use(
        http.get("/api/payouts", () =>
          HttpResponse.json({
            items: [approvedPayout, ownPayout],
            next_cursor: null,
          }),
        ),
      );
      return HttpResponse.json(approvedPayout);
    }),
  );
  const { user } = renderApp("/payouts");

  await user.click(
    await screen.findByRole("button", { name: "Approve PO-2004" }),
  );

  // Nothing is sent before the user confirms.
  const dialog = screen.getByRole("alertdialog", {
    name: "Approve this payout?",
  });
  expect(dialog).toHaveTextContent(
    "60 600 F CFA (fee included) to Aminata Bamba",
  );
  expect(approvals).toBe(0);

  await user.click(
    within(dialog).getByRole("button", { name: "Approve payout" }),
  );

  const row = await screen.findByRole("row", { name: /PO-2004/ });
  expect(await within(row).findByText("Approved")).toBeVisible();
  expect(within(row).getByText("by Awa Koné")).toBeVisible();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(approvals).toBe(1);
});

test("rejecting requires a reason and sends it to the API", async () => {
  const bodies: unknown[] = [];
  server.use(
    http.post("/api/payouts/PO-2004/reject", async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({
        ...approvedPayout,
        status: "rejected",
        decision_reason: "Wrong recipient",
      });
    }),
  );
  const { user } = renderApp("/payouts");
  await user.click(
    await screen.findByRole("button", { name: "Reject PO-2004" }),
  );
  const dialog = screen.getByRole("alertdialog");

  // Submitting without a reason: a message, and no request.
  await user.click(
    within(dialog).getByRole("button", { name: "Reject payout" }),
  );
  expect(
    await within(dialog).findByText(/at least 5 characters/i),
  ).toBeVisible();
  expect(bodies).toHaveLength(0);

  await user.type(within(dialog).getByLabelText("Reason"), "Wrong recipient");
  await user.click(
    within(dialog).getByRole("button", { name: "Reject payout" }),
  );

  await expect.poll(() => bodies).toEqual([{ reason: "Wrong recipient" }]);
});

test("when someone else decided first, shows the conflict and refreshes the list", async () => {
  server.use(
    http.post("/api/payouts/PO-2004/approve", () => {
      server.use(
        http.get("/api/payouts", () =>
          HttpResponse.json({ items: [approvedPayout], next_cursor: null }),
        ),
      );
      return problem(
        409,
        "already_decided",
        "This payout was already approved by Awa Koné.",
      );
    }),
  );
  const { user } = renderApp("/payouts");
  await user.click(
    await screen.findByRole("button", { name: "Approve PO-2004" }),
  );
  const dialog = screen.getByRole("alertdialog");

  await user.click(
    within(dialog).getByRole("button", { name: "Approve payout" }),
  );

  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "This payout was already approved by Awa Koné.",
  );
  // The answer is final: the dialog no longer offers to ask again.
  expect(
    within(dialog).getByRole("button", { name: "Approve payout" }),
  ).toBeDisabled();
  // Behind the dialog, the list already tells the truth.
  await user.click(within(dialog).getByRole("button", { name: "Close" }));
  const row = screen.getByRole("row", { name: /PO-2004/ });
  expect(await within(row).findByText("Approved")).toBeVisible();
});

// The list: pages, sort and filter all happen on the server.

/** Collects the query string of every list request the page makes. */
function recordListRequests() {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get("/api/payouts", ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ items: payouts, next_cursor: null });
    }),
  );
  return queries;
}

test("loads the next page of payouts with the cursor the server gave", async () => {
  const cursors: (string | null)[] = [];
  server.use(
    http.get("/api/payouts", ({ request }) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      cursors.push(cursor);
      return HttpResponse.json(
        cursor === null
          ? { items: [pendingPayout], next_cursor: "after-2004" }
          : { items: [ownPayout], next_cursor: null },
      );
    }),
  );
  const { user } = renderApp("/payouts");
  await screen.findByRole("row", { name: /PO-2004/ });
  // Only what was asked for: the second page is not fetched ahead of time.
  expect(screen.getByText("Showing 1 payouts")).toBeVisible();
  expect(cursors).toEqual([null]);

  await user.click(screen.getByRole("button", { name: "Load more" }));

  expect(await screen.findByRole("row", { name: /PO-2003/ })).toBeVisible();
  expect(screen.getByRole("row", { name: /PO-2004/ })).toBeVisible();
  expect(cursors).toEqual([null, "after-2004"]);
  // The last page has no cursor, so there is nothing more to load.
  expect(
    screen.queryByRole("button", { name: "Load more" }),
  ).not.toBeInTheDocument();
});

test("sorts on the server: the choice goes to the URL and to the API", async () => {
  const queries = recordListRequests();
  const { user, router } = renderApp("/payouts");
  await screen.findByRole("row", { name: /PO-2004/ });
  const header = (name: string) => screen.getByRole("columnheader", { name });

  // Newest first until the user asks for something else.
  expect(queries[0]?.get("sort")).toBe("-id");
  expect(header("Payout")).toHaveAttribute("aria-sort", "descending");

  await user.click(header("Amount"));

  await waitFor(() => expect(queries.at(-1)?.get("sort")).toBe("amount"));
  expect(router.state.location.search).toBe("?sort=amount");
  expect(header("Amount")).toHaveAttribute("aria-sort", "ascending");

  await user.click(header("Amount"));

  await waitFor(() => expect(queries.at(-1)?.get("sort")).toBe("-amount"));
  expect(router.state.location.search).toBe("?sort=-amount");
});

test("with Shift, a second column joins the sort as the tie-break", async () => {
  const queries = recordListRequests();
  const { user, router } = renderApp("/payouts?sort=amount");
  await screen.findByRole("row", { name: /PO-2004/ });
  const header = (name: RegExp) => screen.getByRole("columnheader", { name });

  await user.keyboard("{Shift>}");
  await user.click(header(/Payout/));

  await waitFor(() => expect(queries.at(-1)?.get("sort")).toBe("amount,id"));
  expect(router.state.location.search).toBe("?sort=amount%2Cid");
  // One header carries `aria-sort`; the number and the words tell the rest.
  expect(header(/Amount/)).toHaveAttribute("aria-sort", "ascending");
  expect(header(/Amount/)).toHaveTextContent("Amount1");
  expect(header(/Payout/)).toHaveAttribute("aria-sort", "none");
  expect(header(/Payout/)).toHaveAccessibleName("Payout, sort 2, ascending");

  // Again turns it around in its place, and a third time takes it out.
  await user.click(header(/Payout/));
  await waitFor(() => expect(queries.at(-1)?.get("sort")).toBe("amount,-id"));

  // No request to wait for this time: this sort is the one the page opened
  // with, and its rows are still in the cache.
  await user.click(header(/Payout/));
  expect(router.state.location.search).toBe("?sort=amount");
  expect(header(/Payout/)).toHaveAccessibleName("Payout");
});

test("without Shift, a click sorts by that column alone", async () => {
  const queries = recordListRequests();
  const { user, router } = renderApp("/payouts?sort=amount,-id");
  await screen.findByRole("row", { name: /PO-2004/ });
  expect(queries[0]?.get("sort")).toBe("amount,-id");

  await user.click(screen.getByRole("columnheader", { name: /Amount/ }));

  // The tie-break goes, and the column turns around as it always did.
  await waitFor(() => expect(queries.at(-1)?.get("sort")).toBe("-amount"));
  expect(router.state.location.search).toBe("?sort=-amount");
});

test("ignores a sort the server can't do", async () => {
  // With pages, only the server can sort, and it offers two columns.
  const queries = recordListRequests();
  renderApp("/payouts?sort=created_by");

  await screen.findByRole("row", { name: /PO-2004/ });

  expect(queries[0]?.get("sort")).toBe("-id");
  expect(
    screen.getByRole("columnheader", { name: "Created by" }),
  ).not.toHaveAttribute("aria-sort");
});

test("filters by status, so a payout that waits is never pages away", async () => {
  const queries = recordListRequests();
  const { user, router } = renderApp("/payouts");
  await screen.findByRole("row", { name: /PO-2004/ });
  expect(queries[0]?.has("status")).toBe(false);

  await user.click(screen.getByRole("button", { name: /status/i }));
  await user.click(screen.getByRole("option", { name: "Pending approval" }));

  await screen.findByRole("button", { name: /pending approval.*status/i });
  expect(router.state.location.search).toBe("?status=pending_approval");
  expect(queries.at(-1)?.get("status")).toBe("pending_approval");
});

test("when no payout has the chosen status, offers to clear the filter", async () => {
  server.use(
    http.get("/api/payouts", ({ request }) =>
      HttpResponse.json({
        items: new URL(request.url).searchParams.has("status") ? [] : payouts,
        next_cursor: null,
      }),
    ),
  );
  const { user, router } = renderApp("/payouts?status=rejected&sort=-amount");

  await user.click(await screen.findByRole("button", { name: "Clear filter" }));

  expect(await screen.findByRole("row", { name: /PO-2004/ })).toBeVisible();
  // The sort stays: it is not what hid the rows.
  expect(router.state.location.search).toBe("?sort=-amount");
});

test("when the API answers 403, says so instead of breaking", async () => {
  server.use(
    http.get("/api/payouts", () =>
      problem(403, "forbidden", "You don't have permission to do this."),
    ),
  );
  renderApp("/payouts");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "You don't have permission to do this.",
  );
  expect(
    screen.queryByRole("button", { name: "Retry" }),
  ).not.toBeInTheDocument();
});
