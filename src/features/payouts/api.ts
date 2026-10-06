import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { summaryQuery } from "@/features/dashboard/api";
import { api, pageOf } from "@/lib/api";
import type { Currency, MinorUnits } from "@/lib/money";
import { toSortParam } from "@/lib/sort";
import {
  PayoutSchema,
  QuoteSchema,
  type PayoutFilters,
  type PayoutFormValues,
  type PayoutSort,
} from "./schemas";

const PayoutPageSchema = pageOf(PayoutSchema);

export const payoutQueries = {
  all: ["payouts"] as const,

  // Pages with the server's cursor, like the transactions list: there are
  // too many payouts to ask for all of them. What an approver must not miss
  // is found with the status filter, not by scrolling to the end.
  list: (filters: PayoutFilters, sort: PayoutSort) =>
    infiniteQueryOptions({
      queryKey: ["payouts", "list", filters, sort] as const,
      queryFn: ({ pageParam, signal }) =>
        api("/payouts", {
          schema: PayoutPageSchema,
          query: { ...filters, sort: toSortParam(sort), cursor: pageParam },
          signal,
        }),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.next_cursor,
      placeholderData: keepPreviousData,
    }),

  /** The fee is a business rule, so the server computes it. The UI only shows it. */
  quote: (amount: MinorUnits) =>
    queryOptions({
      queryKey: ["payouts", "quote", amount] as const,
      queryFn: ({ signal }) =>
        api("/payouts/quote", {
          schema: QuoteSchema,
          query: { amount },
          signal,
        }),
      staleTime: 60_000,
    }),
};

/** After any change to a payout, everything that shows payouts is out of date. */
function refreshPayouts(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: payoutQueries.all }),
    queryClient.invalidateQueries({ queryKey: summaryQuery.queryKey }),
  ]);
}

// Derived from the form type instead of written again: the request body is the
// form's output, with the amount as money and a currency.
export type NewPayout = Omit<PayoutFormValues, "amount"> & {
  amount: MinorUnits;
  currency: Currency;
  /** Created once per payout attempt and sent again on every retry of it. */
  idempotencyKey: string;
};

export function useCreatePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idempotencyKey, ...payout }: NewPayout) =>
      api("/payouts", {
        method: "POST",
        body: payout,
        headers: { "Idempotency-Key": idempotencyKey },
        schema: PayoutSchema,
      }),
    // Returning the promise keeps the mutation pending until the list is fresh.
    onSuccess: () => refreshPayouts(queryClient),
  });
}

/** A union, so "reject" without a reason doesn't compile. */
export type Decision = { id: string } & (
  { decision: "approve" } | { decision: "reject"; reason: string }
);

export function useDecidePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (decision: Decision) =>
      api(`/payouts/${encodeURIComponent(decision.id)}/${decision.decision}`, {
        method: "POST",
        body:
          decision.decision === "reject"
            ? { reason: decision.reason }
            : undefined,
        schema: PayoutSchema,
      }),
    // No optimistic update on money: the row changes only when the server has
    // said so. onSettled (not onSuccess) because a 409 also means our list is
    // out of date: someone else decided first.
    onSettled: () => refreshPayouts(queryClient),
  });
}
