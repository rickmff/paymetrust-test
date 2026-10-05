import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { createQueryClient } from "@/app/query-client";
import { routes } from "@/app/router";
import { users, type Role } from "./fixtures";
import { problem, server } from "./server";

type RenderAppOptions = {
  /** Who is signed in. `null` is an anonymous visitor. */
  as?: Role | null;
};

/**
 * Renders the real app at a URL: real routes, guards, layouts, forms and
 * TanStack Query. Only the network is fake (MSW).
 *
 * Each call gets its own QueryClient (no cache shared between tests) with
 * retries off (a failing request fails now, not after the backoff).
 */
export function renderApp(
  path: string,
  { as = "approver" }: RenderAppOptions = {},
) {
  server.use(
    http.get("/api/me", () =>
      as
        ? HttpResponse.json(users[as])
        : problem(401, "unauthenticated", "Sign in to continue."),
    ),
  );

  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const { unmount } = render(
    <QueryClientProvider client={createQueryClient({ retry: false })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { user: userEvent.setup(), router, unmount };
}
