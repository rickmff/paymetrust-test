import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
} from "@tanstack/react-query";
import { api, pageOf } from "@/lib/api";
import { toSortParam } from "@/lib/sort";
import {
  TransactionSchema,
  type TransactionFilters,
  type TransactionSort,
} from "./schemas";

const TransactionPageSchema = pageOf(TransactionSchema);

/** Mobile money is asynchronous: 2s, 4s, 8s, 16s, then every 30s. */
export function pollDelay(attempt: number): number {
  return Math.min(2_000 * 2 ** attempt, 30_000);
}

/**
 * Query options live in one place per feature. Components, tests and cache
 * invalidation all use these, so a key is never typed twice.
 * Keys are hierarchical: ["transactions"] matches every list and detail.
 */
export const transactionQueries = {
  all: ["transactions"] as const,

  list: (filters: TransactionFilters, sort: TransactionSort) =>
    infiniteQueryOptions({
      // The filters and the sort are part of the key: a new view of the list
      // is a new cache entry, and starts again from its first page.
      queryKey: ["transactions", "list", filters, sort] as const,
      queryFn: ({ pageParam, signal }) =>
        api("/transactions", {
          schema: TransactionPageSchema,
          query: { ...filters, sort: toSortParam(sort), cursor: pageParam },
          signal,
        }),
      // A widening assertion: `null` alone would infer the page param as `null`,
      // and the next cursor (a string) would not fit.
      initialPageParam: null as string | null,
      // The server's cursor, not a page number. null ends the list.
      getNextPageParam: (lastPage) => lastPage.next_cursor,
      // Statuses change within seconds, so this goes stale quickly.
      staleTime: 5_000,
      // On a filter or sort change, keep showing the old rows until the new ones arrive.
      placeholderData: keepPreviousData,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: ["transactions", "detail", id] as const,
      queryFn: ({ signal }) =>
        api(`/transactions/${encodeURIComponent(id)}`, {
          schema: TransactionSchema,
          signal,
        }),
      staleTime: 0,
      // Poll only while the operator hasn't answered, backing off each time.
      refetchInterval: (query) =>
        query.state.data?.status === "pending"
          ? pollDelay(query.state.dataUpdateCount - 1)
          : false,
    }),
};
