import { createContext, use } from "react";
import type { Permission, User } from "./schemas";

/**
 * Default is `undefined` on purpose: there is no sensible "empty user".
 * <RequireAuth> provides the value; everything under it can rely on a user.
 */
export const SessionContext = createContext<User | undefined>(undefined);

/** The signed-in user. Never undefined: it throws when used outside <RequireAuth>. */
export function useSession(): User {
  const user = use(SessionContext);
  if (!user) throw new Error("useSession must be used inside <RequireAuth>");
  return user;
}

/**
 * The single place the UI asks "may this user do X?".
 * It checks permissions, never role names: roles get renamed and merged,
 * the question "can approve a payout?" stays the same.
 */
export function useCan(): (permission: Permission) => boolean {
  const { permissions } = useSession();
  return (permission) => permissions.includes(permission);
}
