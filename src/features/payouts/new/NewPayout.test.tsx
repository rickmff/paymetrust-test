import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { pendingPayout } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { problem, server } from "@/test/server";

const created = { ...pendingPayout, id: "PO-2005" };

/** Records every POST /api/payouts and answers with whatever the test decides. */
function recordCreateRequests(
  respond: () => Response = () => HttpResponse.json(created, { status: 201 }),
) {
  const requests: { key: string | null; body: unknown }[] = [];
  server.use(
    http.post("/api/payouts", async ({ request }) => {
      requests.push({
        key: request.headers.get("Idempotency-Key"),
        body: await request.json(),
      });
      return respond();
    }),
  );
  return requests;
}

// Small helpers that act like a user. Assertions stay in the tests.

async function fillRecipient(user: UserEvent, phone = "+225 07 01 02 03 04") {
  await user.click(await screen.findByRole("button", { name: /operator/i }));
  await user.click(screen.getByRole("option", { name: "Wave" }));
  await user.type(screen.getByLabelText("Recipient name"), "Aminata Bamba");
  await user.type(screen.getByLabelText("Mobile money number"), phone);
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function fillAmount(user: UserEvent, amount: string) {
  await user.type(await screen.findByLabelText("Amount (F CFA)"), amount);
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

test("rejects a zero amount without calling the API", async () => {
  const requests = recordCreateRequests();
  const { user, router } = renderApp("/payouts/new", { as: "maker" });
  await fillRecipient(user);

  await fillAmount(user, "0");

  expect(
    await screen.findByText("Amount must be greater than 0"),
  ).toBeVisible();
  expect(screen.getByLabelText("Amount (F CFA)")).toBeInvalid();
  expect(router.state.location.pathname).toBe("/payouts/new/amount");
  expect(requests).toHaveLength(0);
});

test("creates a payout: review shows the fee, the API gets an integer amount and an idempotency key", async () => {
  const requests = recordCreateRequests();
  const { user, router } = renderApp("/payouts/new", { as: "maker" });

  await fillRecipient(user);
  await fillAmount(user, "5000");

  // Review: what the user confirms is what the server quoted.
  expect(await screen.findByText("5 100 F CFA")).toBeVisible(); // total = amount + fee
  expect(screen.getByText("100 F CFA")).toBeVisible(); // fee
  expect(screen.getByText("+225 07 01 02 03 04")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Create payout" }));

  expect(
    await screen.findByText("Payout PO-2005 was sent for approval"),
  ).toBeVisible();
  expect(router.state.location.pathname).toBe("/payouts");
  // The notice is shown once: it doesn't stay in the history entry, where a
  // reload or the Back button would bring it up again.
  await waitFor(() => expect(router.state.location.state).toBeNull());
  expect(
    screen.getByText("Payout PO-2005 was sent for approval"),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]?.body).toEqual({
    amount: 5000, // an integer in minor units, not "5000" and not 5000.0
    currency: "XOF",
    operator: "wave",
    recipient_name: "Aminata Bamba",
    recipient_phone: "+2250701020304", // normalized by the schema
    reference: "",
  });
  expect(requests[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
});

test("the amount can be entered with the mouse alone, on the on-screen keypad", async () => {
  const requests = recordCreateRequests();
  const { user } = renderApp("/payouts/new", { as: "maker" });
  await fillRecipient(user);

  // No keyboard: a click on the field, then on the keys it offers.
  await user.click(await screen.findByLabelText("Amount (F CFA)"));
  const keypad = within(screen.getByRole("group", { name: "Numeric keypad" }));
  for (const digit of "5000") {
    await user.click(keypad.getByRole("button", { name: digit }));
  }
  await user.click(screen.getByRole("button", { name: "Continue" }));

  // The form got the same value typing would have given it.
  expect(await screen.findByText("5 100 F CFA")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Create payout" }));
  await screen.findByText("Payout PO-2005 was sent for approval");
  expect(requests[0]?.body).toMatchObject({ amount: 5000 });
});

test("the phone number is typed without its country code and shown in pairs", async () => {
  const { user } = renderApp("/payouts/new", { as: "maker" });
  const phone = await screen.findByLabelText("Mobile money number");

  await user.type(phone, "0701020304");
  expect(phone).toHaveValue("07 01 02 03 04");

  // A correction in the middle: Backspace after a space takes the digit
  // before it, and the next digit goes where that one was.
  await user.keyboard("{ArrowLeft}{ArrowLeft}{Backspace}9");
  expect(phone).toHaveValue("07 01 02 09 04");

  // The country code is already there: typing it again adds nothing.
  await user.clear(phone);
  await user.type(phone, "+225 05 01 02 03 04");
  expect(phone).toHaveValue("05 01 02 03 04");
});

test("the phone number can be entered on the on-screen keypad and confirmed there", async () => {
  const { user, router } = renderApp("/payouts/new", { as: "maker" });
  await user.click(await screen.findByRole("button", { name: /operator/i }));
  await user.click(screen.getByRole("option", { name: "MTN MoMo" }));
  await user.type(screen.getByLabelText("Recipient name"), "Aminata Bamba");

  const phone = screen.getByLabelText("Mobile money number");
  await user.click(phone);
  const keypad = within(screen.getByRole("group", { name: "Numeric keypad" }));
  for (const digit of "0701020304") {
    await user.click(keypad.getByRole("button", { name: digit }));
  }
  expect(phone).toHaveValue("07 01 02 03 04");

  // Confirm closes the keypad and has the form check the number right away.
  await user.click(keypad.getByRole("button", { name: "Confirm" }));
  expect(
    await screen.findByText("This number is not on MTN MoMo"),
  ).toBeVisible();
  expect(
    screen.queryByRole("group", { name: "Numeric keypad" }),
  ).not.toBeInTheDocument();

  // Fixed on the keypad too: its backspace crosses the spaces like the keyboard's.
  await user.click(phone);
  const reopened = within(
    screen.getByRole("group", { name: "Numeric keypad" }),
  );
  for (let press = 0; press < 10; press += 1) {
    await user.click(reopened.getByRole("button", { name: "Backspace" }));
  }
  expect(phone).toHaveValue("");
  for (const digit of "0501020304") {
    await user.click(reopened.getByRole("button", { name: digit }));
  }
  await user.click(reopened.getByRole("button", { name: "Confirm" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));

  await screen.findByLabelText("Amount (F CFA)");
  expect(router.state.location.pathname).toBe("/payouts/new/amount");
});

test("puts a 422 from the server on the field that caused it, on the step that owns it", async () => {
  recordCreateRequests(() =>
    problem(422, "validation_failed", "Some fields need your attention.", [
      {
        field: "recipient_phone",
        message: "No mobile money wallet was found for this number.",
      },
    ]),
  );
  const { user, router } = renderApp("/payouts/new", { as: "maker" });
  await fillRecipient(user, "+225 07 01 02 00 00");
  await fillAmount(user, "5000");

  await user.click(
    await screen.findByRole("button", { name: "Create payout" }),
  );

  // Back on step 1, with the server's message attached to the phone field.
  const phone = await screen.findByLabelText("Mobile money number");
  expect(router.state.location.pathname).toBe("/payouts/new/recipient");
  expect(phone).toBeInvalid();
  // The focus is on the field to fix, not at the top of the page.
  expect(phone).toHaveFocus();
  // The description a screen reader announces: help text plus the error.
  expect(phone).toHaveAccessibleDescription(
    /No mobile money wallet was found for this number\./,
  );
  // What the user already typed is still there.
  expect(screen.getByLabelText("Recipient name")).toHaveValue("Aminata Bamba");
});

test("a retry after a network failure reuses the same idempotency key", async () => {
  let attempts = 0;
  const requests = recordCreateRequests(() => {
    attempts += 1;
    // First attempt: the connection drops. We can't know if the payout was created.
    return attempts === 1
      ? HttpResponse.error()
      : HttpResponse.json(created, { status: 201 });
  });
  const { user } = renderApp("/payouts/new", { as: "maker" });
  await fillRecipient(user);
  await fillAmount(user, "5000");

  await user.click(
    await screen.findByRole("button", { name: "Create payout" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "The payout was not created",
  );

  await user.click(screen.getByRole("button", { name: "Create payout" }));
  await screen.findByText("Payout PO-2005 was sent for approval");

  // Same key twice: the server creates the payout once, whatever happened to attempt 1.
  expect(requests).toHaveLength(2);
  expect(requests[1]?.key).toBe(requests[0]?.key);
});

test("a payout changed after a failed attempt is sent under a new idempotency key", async () => {
  let attempts = 0;
  const requests = recordCreateRequests(() => {
    attempts += 1;
    return attempts === 1
      ? HttpResponse.error()
      : HttpResponse.json(created, { status: 201 });
  });
  const { user } = renderApp("/payouts/new", { as: "maker" });
  await fillRecipient(user);
  await fillAmount(user, "5000");
  await user.click(
    await screen.findByRole("button", { name: "Create payout" }),
  );
  await screen.findByRole("alert");

  // Not a retry: the user goes back and asks for another amount.
  await user.click(screen.getByRole("link", { name: "Back" }));
  await user.clear(await screen.findByLabelText("Amount (F CFA)"));
  await fillAmount(user, "9000");
  await user.click(
    await screen.findByRole("button", { name: "Create payout" }),
  );
  await screen.findByText("Payout PO-2005 was sent for approval");

  // With the first key, a server that did create the 5 000 payout would have
  // answered with it again, for a user who had just reviewed 9 000.
  expect(requests.map((request) => request.body)).toMatchObject([
    { amount: 5000 },
    { amount: 9000 },
  ]);
  expect(requests[1]?.key).toMatch(/^[0-9a-f-]{36}$/);
  expect(requests[1]?.key).not.toBe(requests[0]?.key);
});

test("going back and forth without changing anything keeps the idempotency key", async () => {
  let attempts = 0;
  const requests = recordCreateRequests(() => {
    attempts += 1;
    return attempts === 1
      ? HttpResponse.error()
      : HttpResponse.json(created, { status: 201 });
  });
  const { user } = renderApp("/payouts/new", { as: "maker" });
  await fillRecipient(user);
  await fillAmount(user, "5000");
  await user.click(
    await screen.findByRole("button", { name: "Create payout" }),
  );
  await screen.findByRole("alert");

  await user.click(screen.getByRole("link", { name: "Back" }));
  await screen.findByLabelText("Amount (F CFA)");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(
    await screen.findByRole("button", { name: "Create payout" }),
  );
  await screen.findByText("Payout PO-2005 was sent for approval");

  expect(requests[1]?.key).toBe(requests[0]?.key);
});

test("opening the review URL directly sends the user to the first unfinished step", async () => {
  const { router } = renderApp("/payouts/new/review", { as: "maker" });

  expect(await screen.findByLabelText("Recipient name")).toBeVisible();
  expect(router.state.location.pathname).toBe("/payouts/new/recipient");
});

test("keeps a finished step when the page is reloaded", async () => {
  const first = renderApp("/payouts/new", { as: "maker" });
  await fillRecipient(first.user);
  await screen.findByLabelText("Amount (F CFA)");
  first.unmount();

  // A reload: a new app instance, the same browser tab (sessionStorage).
  renderApp("/payouts/new/recipient", { as: "maker" });

  expect(await screen.findByLabelText("Recipient name")).toHaveValue(
    "Aminata Bamba",
  );
  // Stored as the API wants it, shown as it was typed.
  expect(screen.getByLabelText("Mobile money number")).toHaveValue(
    "07 01 02 03 04",
  );
});

test("a viewer who types the URL gets a clear refusal, not the form", async () => {
  renderApp("/payouts/new", { as: "viewer" });

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "You don't have access to this page",
  );
  expect(screen.queryByLabelText("Recipient name")).not.toBeInTheDocument();
});
