import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { approvedPayout, ownPayout, pendingPayout } from "@/test/fixtures";
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

test("shows every payout even when the API sends them in pages", async () => {
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
  renderApp("/payouts");

  // A payout waiting for approval on page 2 is still on screen.
  expect(await screen.findByRole("row", { name: /PO-2003/ })).toBeVisible();
  expect(screen.getByRole("row", { name: /PO-2004/ })).toBeVisible();
  expect(cursors).toEqual([null, "after-2004"]);
});

// Sorting: the whole list is in the browser, so no request is needed.

test("sorts the list in the browser, and keeps the choice in the URL", async () => {
  let requests = 0;
  server.use(
    http.get("/api/payouts", () => {
      requests += 1;
      return HttpResponse.json({
        items: [pendingPayout, ownPayout],
        next_cursor: null,
      });
    }),
  );
  const { user, router } = renderApp("/payouts");
  await screen.findByRole("row", { name: /PO-2004/ });
  const ids = () =>
    screen.getAllByRole("rowheader").map((cell) => cell.textContent);
  const header = (name: string) => screen.getByRole("columnheader", { name });

  // Newest first, the order the server sends.
  expect(ids()).toEqual(["PO-2004", "PO-2003"]);
  expect(header("Payout")).toHaveAttribute("aria-sort", "descending");

  await user.click(header("Amount"));

  // 9 000 before 60 000.
  await waitFor(() => expect(ids()).toEqual(["PO-2003", "PO-2004"]));
  expect(header("Amount")).toHaveAttribute("aria-sort", "ascending");
  expect(router.state.location.search).toBe("?sort=amount");

  await user.click(header("Amount"));

  await waitFor(() => expect(ids()).toEqual(["PO-2004", "PO-2003"]));
  expect(router.state.location.search).toBe("?sort=-amount");
  expect(requests).toBe(1);
});

test("sorts a column by what it shows, not by the raw field", async () => {
  // `created_by` is an object; the cell shows its name. Awa before Kofi.
  renderApp("/payouts?sort=created_by");

  await screen.findByRole("row", { name: /PO-2004/ });

  expect(
    screen.getAllByRole("rowheader").map((cell) => cell.textContent),
  ).toEqual(["PO-2003", "PO-2004"]);
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
