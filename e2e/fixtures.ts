import {
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

export const ROLES = ["viewer", "maker", "approver"] as const;
export type Role = (typeof ROLES)[number];

/** Where auth.setup.ts saves each role's session (cookies). Git-ignored. */
export const sessionFile = (role: Role) => `e2e/.auth/${role}.json`;

/** Unique per test run, so tests never collide and can run in any order. */
export const uniqueReference = () => `E2E ${crypto.randomUUID().slice(0, 8)}`;

type Fixtures = {
  /**
   * A page already signed in as a role. Each call is a separate browser
   * context, i.e. a separate person: one test can drive a maker and an
   * approver side by side.
   */
  pageAs: (role: Role) => Promise<Page>;
  /** The API as a role, to prepare data without clicking through the UI. */
  apiAs: (role: Role) => Promise<APIRequestContext>;
};

export const test = base.extend<Fixtures>({
  pageAs: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async (role) => {
      const context = await browser.newContext({
        storageState: sessionFile(role),
      });
      contexts.push(context);
      return context.newPage();
    });
    // Teardown: runs after the test, pass or fail.
    await Promise.all(contexts.map((context) => context.close()));
  },

  apiAs: async ({ playwright, baseURL }, use) => {
    const contexts: APIRequestContext[] = [];
    await use(async (role) => {
      const context = await playwright.request.newContext({
        baseURL,
        storageState: sessionFile(role),
      });
      contexts.push(context);
      return context;
    });
    await Promise.all(contexts.map((context) => context.dispose()));
  },
});

export { expect } from "@playwright/test";
