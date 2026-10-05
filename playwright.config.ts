import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  // Traces and the screenshots of failed tests. Playwright needs this folder
  // and empties it at the start of every run, so it stays out of the root.
  outputDir: "node_modules/.cache/playwright/e2e",
  // Tests are independent (each creates its own data), so they can run in parallel.
  fullyParallel: true,
  // A `test.only` left in by mistake fails the pipeline instead of skipping the suite.
  forbidOnly: isCI,
  // One retry, in CI only. A test that needs it is flaky and goes on the fix list.
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["html", { open: "never" }], ["github"]] : "list",

  use: {
    baseURL: "http://localhost:5173",
    // Record a trace only when a test is retried: cheap, and enough to debug
    // a failure without reproducing it (npx playwright show-trace <file>).
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Signs in once per role and saves each session to a file.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    // Safari and Firefox are two more entries like the one above:
    // { name: "webkit", use: { ...devices["Desktop Safari"] }, dependencies: ["setup"] },
  ],

  // Playwright starts the whole system and waits for both URLs before testing.
  webServer: [
    {
      command: "go -C api run .",
      url: "http://127.0.0.1:8080/api/health",
      env: { ENABLE_TEST_ROUTES: "1" },
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      // CI tests what ships (the production build); locally, the dev server is faster.
      command: isCI ? "npm run build && npm run preview" : "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
