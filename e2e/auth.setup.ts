import { expect, test as setup } from "@playwright/test";
import { ROLES, sessionFile } from "./fixtures";

// Runs before every other test (see `dependencies` in playwright.config.ts).
// Signing in through the UI once per role also proves the login screen works;
// after that, tests start already signed in and never repeat it.
for (const role of ROLES) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(`${role}@demo.test`);
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

    await page.context().storageState({ path: sessionFile(role) });
  });
}
