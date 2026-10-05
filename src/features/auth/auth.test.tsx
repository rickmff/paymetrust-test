import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { users } from "@/test/fixtures";
import { renderApp } from "@/test/render";
import { problem, server } from "@/test/server";

test("an anonymous visitor signs in and lands on the page they asked for", async () => {
  const credentials: unknown[] = [];
  server.use(
    http.post("/api/login", async ({ request }) => {
      credentials.push(await request.json());
      return HttpResponse.json(users.viewer);
    }),
  );
  const { user, router } = renderApp("/transactions", { as: null });

  // The guard redirected to the login form.
  await user.type(await screen.findByLabelText("Email"), "viewer@demo.test");
  await user.type(screen.getByLabelText("Password"), "demo1234");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(
    await screen.findByRole("heading", { name: "Transactions" }),
  ).toBeVisible();
  expect(router.state.location.pathname).toBe("/transactions");
  expect(screen.getByText("Fatou Diallo")).toBeVisible();
  expect(credentials).toEqual([
    { email: "viewer@demo.test", password: "demo1234" },
  ]);
});

test("signing in returns to the filtered list the visitor asked for, not just its path", async () => {
  server.use(http.post("/api/login", () => HttpResponse.json(users.viewer)));
  const { user, router } = renderApp("/transactions?status=failed", {
    as: null,
  });

  await user.type(await screen.findByLabelText("Email"), "viewer@demo.test");
  await user.type(screen.getByLabelText("Password"), "demo1234");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  await screen.findByRole("heading", { name: "Transactions" });
  expect(router.state.location.search).toBe("?status=failed");
});

test("an address that points outside the app is not followed after signing in", async () => {
  server.use(http.post("/api/login", () => HttpResponse.json(users.viewer)));
  // A link someone was sent: to a browser, "//host" is another site.
  const { user, router } = renderApp("//evil.example/transactions", {
    as: null,
  });

  await user.type(await screen.findByLabelText("Email"), "viewer@demo.test");
  await user.type(screen.getByLabelText("Password"), "demo1234");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(
    await screen.findByRole("heading", { name: "Dashboard" }),
  ).toBeVisible();
  expect(router.state.location.pathname).toBe("/");
});

test("validates the form before calling the API", async () => {
  const { user } = renderApp("/login", { as: null });

  await user.click(await screen.findByRole("button", { name: "Sign in" }));

  // No handler for POST /api/login exists: had the form submitted, the test would fail.
  expect(await screen.findByText("Enter a valid email address")).toBeVisible();
  expect(screen.getByText("Enter your password")).toBeVisible();
});

test("shows the server's message when the credentials are wrong", async () => {
  server.use(
    http.post("/api/login", () =>
      problem(401, "invalid_credentials", "Wrong email or password."),
    ),
  );
  const { user } = renderApp("/login", { as: null });

  await user.type(await screen.findByLabelText("Email"), "viewer@demo.test");
  await user.type(screen.getByLabelText("Password"), "nope");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Wrong email or password.",
  );
});

test("signing out returns to the login form", async () => {
  server.use(
    http.post("/api/logout", () => new HttpResponse(null, { status: 204 })),
  );
  const { user, router } = renderApp("/", { as: "viewer" });

  await user.click(await screen.findByRole("button", { name: "Sign out" }));

  expect(await screen.findByRole("button", { name: "Sign in" })).toBeVisible();
  expect(router.state.location.pathname).toBe("/login");
});

test("a 401 from any request ends the session and asks to sign in again", async () => {
  server.use(
    http.get("/api/transactions", () =>
      problem(401, "unauthenticated", "Sign in to continue."),
    ),
  );
  const { router } = renderApp("/transactions", { as: "viewer" });

  expect(await screen.findByRole("button", { name: "Sign in" })).toBeVisible();
  expect(router.state.location.pathname).toBe("/login");
});

test("going to another page names it in the tab and moves the focus to its content", async () => {
  const { user } = renderApp("/", { as: "viewer" });
  await screen.findByRole("heading", { name: "Dashboard" });
  expect(document.title).toBe("Dashboard · Merchant Console");

  await user.click(screen.getByRole("link", { name: "Transactions" }));

  // What a full page load does by itself, and a client-side navigation doesn't.
  await screen.findByRole("heading", { name: "Transactions" });
  expect(document.title).toBe("Transactions · Merchant Console");
  expect(screen.getByRole("main")).toHaveFocus();
});

test("the first Tab stop is a link that skips the menu", async () => {
  const { user } = renderApp("/", { as: "viewer" });
  await screen.findByRole("heading", { name: "Dashboard" });

  await user.tab();

  const skip = screen.getByRole("link", { name: "Skip to content" });
  expect(skip).toHaveFocus();
  expect(skip).toHaveAttribute("href", "#main");
  expect(screen.getByRole("main")).toHaveAttribute("id", "main");
});

test("the menu only offers what the user may open", async () => {
  renderApp("/", { as: "viewer" });

  const menu = await screen.findByRole("navigation", { name: "Main" });

  expect(menu).toHaveTextContent("Dashboard");
  expect(menu).toHaveTextContent("Transactions");
  expect(menu).toHaveTextContent("Payouts"); // a viewer has payout:read
  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
