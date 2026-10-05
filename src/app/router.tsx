import { Navigate, type RouteObject } from "react-router";
import { RequireAuth, RequirePermission } from "@/features/auth/guards";
import { AppLayout } from "./AppLayout";
import { PageLoading, RootLayout } from "./RootLayout";
import { NotFound, RouteError } from "./RouteError";

/**
 * The route tree as data. main.tsx feeds it to a browser router; the tests
 * feed the very same tree to a memory router, so they exercise the real
 * guards and layouts.
 *
 * Routes without a `path` are layout routes: they wrap their children (a
 * guard, a shell) without adding a URL segment.
 *
 * The shell and the guards come with the first download. Each page is a
 * `lazy` route: its code is fetched when the route is first visited, so the
 * login screen doesn't carry the tables and the wizard with it.
 */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    // What is on screen while the code of the first page is on its way.
    hydrateFallbackElement: <PageLoading />,
    children: [
      {
        path: "login",
        lazy: () =>
          import("@/features/auth/LoginPage").then(({ LoginPage }) => ({
            Component: LoginPage,
          })),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                index: true,
                lazy: () =>
                  import("@/features/dashboard/DashboardPage").then(
                    ({ DashboardPage }) => ({ Component: DashboardPage }),
                  ),
              },
              {
                path: "transactions",
                lazy: () =>
                  import("@/features/transactions/TransactionsPage").then(
                    ({ TransactionsPage }) => ({ Component: TransactionsPage }),
                  ),
              },
              {
                path: "transactions/:id",
                lazy: () =>
                  import("@/features/transactions/TransactionDetailPage").then(
                    ({ TransactionDetailPage }) => ({
                      Component: TransactionDetailPage,
                    }),
                  ),
              },
              {
                path: "payouts",
                element: <RequirePermission permission="payout:read" />,
                children: [
                  {
                    index: true,
                    lazy: () =>
                      import("@/features/payouts/PayoutsPage").then(
                        ({ PayoutsPage }) => ({ Component: PayoutsPage }),
                      ),
                  },
                  {
                    path: "new",
                    element: <RequirePermission permission="payout:create" />,
                    children: [
                      {
                        lazy: () =>
                          import("@/features/payouts/new/NewPayoutLayout").then(
                            ({ NewPayoutLayout }) => ({
                              Component: NewPayoutLayout,
                            }),
                          ),
                        children: [
                          {
                            index: true,
                            element: <Navigate to="recipient" replace />,
                          },
                          {
                            path: "recipient",
                            lazy: () =>
                              import("@/features/payouts/new/RecipientStep").then(
                                ({ RecipientStep }) => ({
                                  Component: RecipientStep,
                                }),
                              ),
                          },
                          {
                            path: "amount",
                            lazy: () =>
                              import("@/features/payouts/new/AmountStep").then(
                                ({ AmountStep }) => ({ Component: AmountStep }),
                              ),
                          },
                          {
                            path: "review",
                            lazy: () =>
                              import("@/features/payouts/new/ReviewStep").then(
                                ({ ReviewStep }) => ({ Component: ReviewStep }),
                              ),
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              { path: "*", element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
];
