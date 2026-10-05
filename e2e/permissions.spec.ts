import { expect, test } from "./fixtures";

test("a viewer sees payouts but no way to create or decide them", async ({
  pageAs,
}) => {
  const page = await pageAs("viewer");
  await page.goto("/payouts");

  await expect(page.getByRole("rowheader").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "New payout" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /approve|reject/i }),
  ).toHaveCount(0);
});

test("a viewer who types the wizard's URL is refused by the route guard", async ({
  pageAs,
}) => {
  const page = await pageAs("viewer");
  await page.goto("/payouts/new");

  await expect(page.getByRole("alert")).toContainText(
    "You don't have access to this page",
  );
});

test("the API refuses a viewer, whatever the UI shows", async ({ apiAs }) => {
  // The UI check is only UX. This is the check that protects the money.
  const api = await apiAs("viewer");

  const response = await api.post("/api/payouts", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { amount: 5000 },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ code: "forbidden" });
});

test("an approver can't decide a payout they created", async ({ pageAs }) => {
  const page = await pageAs("approver");
  await page.goto("/payouts");

  // PO-2003 is seeded as created by the approver herself.
  const own = page.getByRole("row").filter({ hasText: "PO-2003" });

  await expect(own.getByRole("button", { name: /^Approve/ })).toBeDisabled();
  await expect(own).toContainText("You created this payout");
});

test("an anonymous visitor is sent to login, then back to the page they wanted", async ({
  page,
}) => {
  // The default `page` fixture has no saved session.
  await page.goto("/payouts?sort=amount");
  await expect(page).toHaveURL(/\/login$/);
  // Each page names itself in the browser tab.
  await expect(page).toHaveTitle("Sign in · Merchant Console");

  await page.getByLabel("Email").fill("viewer@demo.test");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();

  // Back to the whole address, query string included.
  await expect(page).toHaveURL(/\/payouts\?sort=amount$/);
  await expect(page.getByRole("heading", { name: "Payouts" })).toBeVisible();
  await expect(page).toHaveTitle("Payouts · Merchant Console");
});

test("the keyboard can skip the menu, and a new page takes the focus", async ({
  pageAs,
}) => {
  const page = await pageAs("viewer");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // The first Tab stop of the page, visible only once it has the focus.
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();

  // A client-side navigation: the focus goes to the new page's content.
  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(
    page.getByRole("heading", { name: "Transactions" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toBeFocused();
});
