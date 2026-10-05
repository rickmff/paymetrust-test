import { expect, test, uniqueReference } from "./fixtures";
import { PayoutsPage } from "./pages/PayoutsPage";

// End-to-end: a real browser, the real Go API, nothing mocked.
// Only the journeys that must never break live here.

test("a payout created by a maker is approved by a second person", async ({
  pageAs,
}) => {
  const reference = uniqueReference();

  // Kofi, the maker, creates the payout.
  const maker = new PayoutsPage(await pageAs("maker"));
  await maker.goto();
  await maker.create({
    operator: "Wave",
    name: "Aminata Bamba",
    phone: "+225 07 01 02 03 04",
    amount: "5000",
    reference,
  });

  await expect(maker.page.getByRole("status")).toContainText(
    "was sent for approval",
  );
  await expect(maker.row(reference)).toContainText("Pending approval");
  await expect(maker.row(reference)).toContainText("5 000 F CFA");
  // The maker has no way to approve it.
  await expect(
    maker.row(reference).getByRole("button", { name: /approve/i }),
  ).toHaveCount(0);

  // Awa, the approver, in her own browser session, approves it.
  const approver = new PayoutsPage(await pageAs("approver"));
  await approver.goto();
  await approver.approve(reference);

  await expect(approver.row(reference)).toContainText("Approved");
  await expect(approver.row(reference)).toContainText("by Awa Koné");

  // Kofi sees the decision the next time his list loads.
  await maker.page.reload();
  await expect(maker.row(reference)).toContainText("Approved");
  // The "sent for approval" notice was for the visit that created the payout.
  await expect(maker.page.getByText("was sent for approval")).toHaveCount(0);
});

test("an idempotency key answers a retry with the same payout, and refuses another one", async ({
  apiAs,
}) => {
  const api = await apiAs("maker");
  const key = crypto.randomUUID();
  const payout = {
    amount: 5000,
    currency: "XOF",
    operator: "wave",
    recipient_name: "Aminata Bamba",
    recipient_phone: "+2250701020304",
    reference: uniqueReference(),
  };
  const send = (data: typeof payout) =>
    api.post("/api/payouts", { headers: { "Idempotency-Key": key }, data });

  const first = await send(payout);
  expect(first.status()).toBe(201);

  // The same request again (a retry after a lost answer): no second payout.
  const retry = await send(payout);
  expect(retry.status()).toBe(200);
  expect(retry.headers()["idempotent-replayed"]).toBe("true");
  expect((await retry.json()).id).toBe((await first.json()).id);

  // The same key for another amount is not a retry. Answering with the first
  // payout would confirm 5 000 to someone who asked for 9 000.
  const changed = await send({ ...payout, amount: 9000 });
  expect(changed.status()).toBe(422);
  expect(await changed.json()).toMatchObject({
    code: "idempotency_key_reused",
  });
});

test("an approver rejects a payout and the reason is recorded", async ({
  pageAs,
  apiAs,
}) => {
  // Arrange through the API: faster than the UI, and this test is not about the wizard.
  const reference = uniqueReference();
  const api = await apiAs("maker");
  const response = await api.post("/api/payouts", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: {
      amount: 12000,
      currency: "XOF",
      operator: "orange_money",
      recipient_name: "Ibrahim Traoré",
      recipient_phone: "+2250701020304",
      reference,
    },
  });
  expect(response.status()).toBe(201);

  const approver = new PayoutsPage(await pageAs("approver"));
  await approver.goto();
  await approver.reject(reference, "Wrong recipient");

  await expect(approver.row(reference)).toContainText("Rejected");
  await expect(approver.row(reference)).toContainText("Wrong recipient");
});

test("the server's own validation reaches the right field of the form", async ({
  pageAs,
}) => {
  const maker = new PayoutsPage(await pageAs("maker"));
  await maker.goto();

  // The frontend accepts this number; only the server knows the wallet doesn't exist.
  await maker.create({
    operator: "Wave",
    name: "Aminata Bamba",
    phone: "+225 07 01 02 00 00",
    amount: "5000",
    reference: uniqueReference(),
  });

  await expect(maker.page).toHaveURL(/\/payouts\/new\/recipient$/);
  await expect(
    maker.page.getByText("No mobile money wallet was found for this number."),
  ).toBeVisible();
  await expect(maker.page.getByLabel("Recipient name")).toHaveValue(
    "Aminata Bamba",
  );
});
