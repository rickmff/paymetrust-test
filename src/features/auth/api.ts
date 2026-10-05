import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { api, isApiError } from "@/lib/api";
import { UserSchema, type Credentials } from "./schemas";

/**
 * The session lives in the query cache: `User` when signed in, `null` when not.
 * "Not signed in" is a normal state, not an error, so a 401 here becomes `null`.
 */
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async ({ signal }) => {
    try {
      return await api("/me", { schema: UserSchema, signal });
    } catch (error) {
      if (isApiError(error) && error.status === 401) return null;
      throw error;
    }
  },
  // Only login, logout and a 401 change the session, and each of them writes
  // the cache explicitly. Nothing to refetch on focus or on a timer.
  staleTime: Infinity,
  retry: false,
});

/** Signs the user out on the client. Called on logout and on any 401. */
export function endSession(queryClient: QueryClient) {
  // <RequireAuth> watches this entry and redirects to /login.
  queryClient.setQueryData(meQuery.queryKey, null);
  // The next person on this browser must not see this person's cached data.
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== meQuery.queryKey[0],
  });
  sessionStorage.clear();
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: Credentials) =>
      api("/login", { method: "POST", body: credentials, schema: UserSchema }),
    onSuccess: (user) => queryClient.setQueryData(meQuery.queryKey, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api("/logout", { method: "POST", schema: z.void() }),
    onSuccess: () => endSession(queryClient),
  });
}
