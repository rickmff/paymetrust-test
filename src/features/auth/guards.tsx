import { Alert, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { ErrorState } from "@/components/ErrorState";
import { meQuery } from "./api";
import type { Permission } from "./schemas";
import { SessionContext, useCan } from "./session";

/** Layout route: everything nested under it requires a session. */
export function RequireAuth() {
  const location = useLocation();
  const session = useQuery(meQuery);

  if (session.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner aria-label="Checking your session" />
      </div>
    );
  }

  if (session.isError) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <ErrorState
          title="Could not check your session"
          error={session.error}
          onRetry={() => session.refetch()}
        />
      </div>
    );
  }

  if (session.data === null) {
    // Remember where the user was going, so login can send them back: the
    // whole address, since a list's filters live in its query string.
    const from = location.pathname + location.search + location.hash;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return (
    <SessionContext value={session.data}>
      <Outlet />
    </SessionContext>
  );
}

/** Layout route: blocks a whole branch of the route tree behind one permission. */
export function RequirePermission({ permission }: { permission: Permission }) {
  const can = useCan();
  if (can(permission)) return <Outlet />;

  return (
    <Alert status="warning" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>You don't have access to this page</Alert.Title>
        <Alert.Description>
          Ask an administrator if you need the "{permission}" permission.
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

type CanProps = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Hides UI the user may never use. This is UX only: the API checks the same
 * permission again and answers 403 (see `can` in api/http.go).
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const can = useCan();
  return can(permission) ? children : fallback;
}
