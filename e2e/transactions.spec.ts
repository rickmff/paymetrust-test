import { expect, test } from "./fixtures";

test("filters live in the URL and survive a reload", async ({ pageAs }) => {
  const page = await pageAs("viewer");
  await page.goto("/transactions");

  await page.getByRole("button", { name: /status/i }).click();
  await page.getByRole("option", { name: "Failed" }).click();

  // Web-first assertions: each one retries until it passes or times out. No sleeps.
  await expect(page).toHaveURL(/status=failed/);
  const rows = page.getByRole("row").filter({ hasText: "PAY-" });
  await expect(rows.first()).toContainText("Failed");
  await expect(rows.filter({ hasNotText: "Failed" })).toHaveCount(0);

  await page.reload();

  await expect(page.getByRole("button", { name: /status/i })).toContainText(
    "Failed",
  );
  await expect(rows.filter({ hasNotText: "Failed" })).toHaveCount(0);
});

test("loads more rows with cursor pagination, without duplicates", async ({
  pageAs,
}) => {
  const page = await pageAs("viewer");
  await page.goto("/transactions");
  const ids = page.getByRole("rowheader");
  await expect(ids).toHaveCount(10);

  await page.getByRole("button", { name: "Load more" }).click();

  await expect(ids).toHaveCount(20);
  const texts = await ids.allTextContents();
  expect(new Set(texts).size).toBe(20);
});

test("sorts on the server, so the order holds across pages", async ({
  pageAs,
}) => {
  const page = await pageAs("viewer");
  await page.goto("/transactions");
  await expect(page.getByRole("rowheader")).toHaveCount(10);

  // Twice: the first click sorts ascending, the second turns it around.
  const header = page.getByRole("columnheader", { name: "Amount" });
  await header.click();
  await header.click();

  await expect(page).toHaveURL(/sort=-amount/);
  await expect(header).toHaveAttribute("aria-sort", "descending");
  // The old rows stay on screen, marked busy, until the sorted ones arrive.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Load more" }).click();

  const cells = page.getByRole("gridcell").filter({ hasText: "F CFA" });
  await expect(cells).toHaveCount(20);
  // Largest first, with no jump back up where the second page starts.
  const amounts = (await cells.allTextContents()).map((text) =>
    Number(text.replace(/\D/g, "")),
  );
  expect(amounts).toEqual([...amounts].sort((a, b) => b - a));

  // The sort is in the URL, so a reload shows the same view.
  const largest = await cells.first().innerText();
  await page.reload();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(cells.first()).toHaveText(largest);
});

test("shows an error when the API fails, and recovers on retry", async ({
  pageAs,
}) => {
  const page = await pageAs("viewer");
  // A state that is hard to produce with a real backend: mock it at the network.
  await page.route("**/api/transactions*", (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.goto("/transactions");

  // The app retries a 5xx twice, with backoff, before it gives up. So the
  // alert takes a few seconds, and the assertion is given the time for that.
  await expect(page.getByRole("alert")).toContainText(
    /could not load transactions/i,
    { timeout: 15_000 },
  );

  await page.unroute("**/api/transactions*");
  await page.getByRole("button", { name: "Retry" }).click();

  await expect(page.getByRole("rowheader").first()).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a pending payment turns into paid when the operator confirms", async ({
  pageAs,
  request,
}) => {
  // Arrange: a pending payment of our own. The test-only routes play the operator.
  const created = await request.post("/api/test/transactions");
  const { id }: { id: string } = await created.json();

  const page = await pageAs("viewer");
  await page.clock.install(); // take control of the page's timers
  await page.goto(`/transactions/${id}`);
  const status = page.getByRole("status");
  await expect(status).toContainText("Waiting for the customer");

  // Act: the customer confirms on their phone (the operator's callback).
  const settled = await request.post(`/api/test/transactions/${id}/settle`, {
    data: { status: "success" },
  });
  expect(settled.ok()).toBe(true);

  // The page polls with backoff. Jump ahead instead of waiting for the next poll.
  await page.clock.fastForward(30_000);

  await expect(status).toContainText("Paid on");
});
