import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

// A port of its own: no clash with the app (5173), the API (8080) or a
// Storybook left open for development (6006).
const PORT = 6116;
const STORYBOOK_DIR = "node_modules/.cache/storybook-visual";

// A small fixed stage. Stories are rendered alone, so nothing needs more.
const viewport = { width: 640, height: 540 };

/**
 * Playwright against Storybook: components in a real browser, on their own.
 * Two kinds of test live in ./visual-tests: screenshots (what it looks like)
 * and interaction (focus, the caret, positioning: what jsdom cannot check).
 *
 * Separate from playwright.config.ts on purpose: these tests need no API and
 * no sign-in, only the stories.
 */
export default defineConfig({
  testDir: "./visual-tests",
  // Traces and the diffs of failed screenshots. Playwright needs this folder
  // and empties it at the start of every run, so it stays out of the root.
  outputDir: "node_modules/.cache/playwright/visual",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [
        ["html", { open: "never", outputFolder: "playwright-report/visual" }],
        ["github"],
      ]
    : "list",

  // Baselines sit next to the tests. The name says which browser and which
  // system drew the image, because fonts are not drawn the same everywhere:
  //   visual-tests/__screenshots__/numpad.visual.spec.ts/open-chromium-darwin.png
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}",
  // In CI a missing baseline is a failure, never a new file written quietly.
  updateSnapshots: isCI ? "none" : "missing",

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport } },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], viewport } },
  ],

  // A static build of Storybook: the same bytes on every run, built in a few
  // seconds. Always rebuilt, so a test never runs against yesterday's stories.
  webServer: {
    command: `storybook build --test --quiet --output-dir ${STORYBOOK_DIR} && vite preview --outDir ${STORYBOOK_DIR} --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/iframe.html`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
