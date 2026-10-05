import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { endSession } from "@/features/auth/api";
import { isApiError } from "@/lib/api";

/**
 * A factory, not a singleton: the app creates one, and every test creates its
 * own, so no cached data leaks from one test into the next.
 */
export function createQueryClient({ retry = true } = {}): QueryClient {
  // Any request, anywhere, that comes back 401 means the session expired.
  const onError = (error: Error) => {
    if (isApiError(error) && error.status === 401) endSession(queryClient);
  };

  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        // Default freshness. Each query overrides it according to how fast its data changes.
        staleTime: 30_000,
        // Retry what can heal (network, 5xx). A 4xx would fail the same way again.
        retry: (failureCount, error) =>
          retry &&
          failureCount < 2 &&
          !(isApiError(error) && error.status < 500),
      },
      mutations: {
        // Never auto-retry a write: a retried payment request can pay twice.
        retry: false,
      },
    },
  });

  return queryClient;
}
