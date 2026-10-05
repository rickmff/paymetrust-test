# Merchant Console

A small practice app for a mobile money payments platform: a merchant sees
collected payments, creates payouts in a multi-step form, and a second person
approves them. Built to exercise one stack end to end, with tests at every level.

**Frontend:** React 19 · TypeScript (strict) · Vite 8 · React Router 8 ·
TanStack Query 5 · React Hook Form + Zod 4 · Tailwind CSS 4 · HeroUI 3
**Backend:** Go (standard library only, in-memory data)
**Tests:** Vitest + Testing Library + MSW · Playwright · Storybook 10

## Run it

You need Node 22.22+ (`.nvmrc` pins the major version, for `nvm use` and for
CI) and Go 1.27+ (`brew install go`).

```bash
npm install
npm run api   # terminal 1: Go API on http://127.0.0.1:8080
npm run dev   # terminal 2: app on http://localhost:5173
```

Sign in with one of the demo accounts (password `demo1234`). In development
the login page has a button for each; the production build leaves them out.

| Account              | Can                                              |
| -------------------- | ------------------------------------------------ |
| `viewer@demo.test`   | read transactions and payouts                    |
| `maker@demo.test`    | also create payouts                              |
| `approver@demo.test` | also approve or reject payouts created by others |

To watch a pending payment update live, open `/transactions/PAY-1035` and play
the operator's confirmation:

```bash
curl -X POST http://127.0.0.1:8080/api/test/transactions/PAY-1035/settle \
  -H 'Content-Type: application/json' -d '{"status":"success"}'
```

## Scripts

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `npm run dev`           | Vite dev server; `/api` is proxied to the Go API                |
| `npm run api`           | Go API with test routes and 300 ms of artificial latency        |
| `npm run check`         | type check, lint, format check, unit and integration tests      |
| `npm test`              | Vitest: unit and integration tests (network mocked with MSW)    |
| `npm run e2e`           | Playwright: starts the API and the app, then runs the journeys  |
| `npm run e2e:ui`        | Playwright's UI mode, with time-travel debugging                |
| `npm run storybook`     | Storybook on http://localhost:6006: components on their own     |
| `npm run visual`        | Playwright against Storybook: screenshots and browser behaviour |
| `npm run visual:update` | the same, rewriting the screenshots it compares against         |
| `npm run build`         | `tsc -b` then the production build                              |

The first E2E run needs a browser: `npx playwright install chromium`.
`npm run visual` runs in three: `npx playwright install chromium webkit firefox`.
It needs no API: it builds Storybook and tests the stories.

## Structure

```
api/                 Go REST API: the contract the frontend is built against
src/
  app/               router, query client, layouts
  lib/               API client, money, formatting (no React)
  components/        shared, domain-aware components on top of HeroUI
    numpad/          on-screen keypad for numeric fields, with its story
  features/
    auth/            session, permissions, route guards, login
    dashboard/       key figures
    transactions/    table with URL filters and sort, cursor pagination, detail with polling
    payouts/         list with approval flow, multi-step "new payout" form
  test/              MSW server, fixtures, render helper
e2e/                 Playwright: auth setup, fixtures, page object, specs
visual-tests/        Playwright against Storybook: screenshots, browser behaviour
.storybook/          Storybook config: the app's stylesheet
```

## Decisions

- **Money is an integer in minor units, branded in TypeScript.** A plain number
  can't be passed where money is expected. Formatting is `Intl.NumberFormat`, so
  XOF correctly shows no decimals.
- **Every API response is parsed with Zod.** Types are inferred from the
  schemas; a contract change fails at the boundary instead of rendering wrong data.
- **Statuses are discriminated unions** with an exhaustive `never` check: a new
  status doesn't compile until every screen handles it.
- **The UI checks permissions, never roles**, through one `can()`. The API checks
  again; the UI check is only UX.
- **No optimistic updates and no automatic retries on money.** Writes carry an
  idempotency key created with the draft, so a retry can't pay twice. The key
  stands for one payout: when the draft changes it gets a new one, and the API
  refuses a key that comes back with a different body.
- **Filters and sort live in the URL; pagination uses the server's cursor.**
  A paged list is sorted by the server, which alone has every row.
- **Each page is its own download.** Pages are `lazy` routes; the shell and the
  guards come first, and a page's code is fetched when its route is visited.
- **A navigation behaves like a page load.** Each page sets the tab's title,
  the focus moves to the new page's content, and the first Tab stop is a link
  that skips the menu.
- **Tests follow risk:** pure logic in unit tests, most behaviour in integration
  tests against a mocked network, a few critical journeys end to end against the
  real API.
- **The on-screen keypad is a second keyboard, not a second input.** It types
  into the focused field with the browser's own editing command, so the caret,
  undo, React Hook Form and validation all behave as they do for a keystroke.
  It lives in the browser's top layer (Popover API) instead of a portal, and is
  positioned in the page, so it scrolls with its field without a frame of lag.
- **What jsdom can't see is tested in a browser.** Focus, the caret and
  positioning of a component are checked against its story, in Chromium,
  WebKit and Firefox, next to the screenshots.

## Screenshots

`npm run visual` compares each picture with a baseline in
`visual-tests/__screenshots__`. A baseline belongs to one browser on one system
(`open-chromium-darwin.png`), because text is not drawn the same
everywhere. The ones in the repository were taken on macOS.

After a change that is meant to be seen, run `npm run visual:update` and look
at the new images before keeping them. On another system, the same command
creates that system's baselines. CI runs on Linux and has none yet, so it runs
the browser-behaviour tests and skips the screenshots (`--grep-invert
@screenshot`); to compare there too, create the Linux baselines in Playwright's
Docker image, commit them, and remove that flag from the workflow.
