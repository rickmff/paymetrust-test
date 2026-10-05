import { Button, Chip, cn } from "@heroui/react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigation } from "react-router";
import { useLogout } from "@/features/auth/api";
import { Can } from "@/features/auth/guards";
import { useSession } from "@/features/auth/session";

/** The signed-in shell: navigation, who you are, and the current page. */
export function AppLayout() {
  const user = useSession();
  const logout = useLogout();
  // "loading" while the code of the next page downloads (see `lazy` in router.tsx).
  const isNavigating = useNavigation().state !== "idle";

  return (
    <div className="min-h-dvh">
      {/* The first Tab stop of every page: past the menu, straight to the
          content. Out of sight until the keyboard reaches it. */}
      <a
        href="#main"
        className="absolute start-4 top-4 z-50 -translate-y-20 rounded-lg bg-surface px-3 py-2 text-sm font-medium shadow-md focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">Merchant Console</span>
          <nav aria-label="Main" className="flex gap-1">
            <NavItem to="/">Dashboard</NavItem>
            <NavItem to="/transactions">Transactions</NavItem>
            <Can permission="payout:read">
              <NavItem to="/payouts">Payouts</NavItem>
            </Can>
          </nav>
          <div className="ms-auto flex items-center gap-3 text-sm">
            <span>{user.name}</span>
            <Chip size="sm">{user.role}</Chip>
            <Button
              size="sm"
              variant="tertiary"
              isPending={logout.isPending}
              onPress={() => logout.mutate()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main
        id="main"
        // Focusable from code only: the skip link and every navigation land here.
        tabIndex={-1}
        aria-busy={isNavigating}
        className={cn(
          "mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 outline-none transition-opacity",
          // Dimmed only when the next page is slow to arrive: a fast one
          // gets there before the delay is over.
          isNavigating && "opacity-60 delay-200",
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    // NavLink sets aria-current="page" on the active link by itself.
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "rounded-lg px-3 py-1.5 text-sm hover:bg-default",
          isActive ? "bg-default font-medium" : "text-muted",
        )
      }
    >
      {children}
    </NavLink>
  );
}
