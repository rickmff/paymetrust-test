import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { z } from "zod";
import { summaryQuery } from "@/features/dashboard/api";
import { api, pageOf } from "@/lib/api";
import type { Currency, MinorUnits } from "@/lib/money";
import {
  PayoutSchema,
  QuoteSchema,
  type Payout,
  type PayoutFormValues,
} from "./schemas";

const PayoutPageSchema = pageOf(PayoutSchema);
type PayoutPage = z.infer<typeof PayoutPageSchema>;

export const payoutQueries = {
  all: ["payouts"] as const,

  list: () =>
    queryOptions({
      queryKey: ["payouts", "list"] as const,
      // Every payout, not one page of them. The page sorts in the browser,
      // and an approver must never miss a payout because it sat on a second
      // page. Today the API answers with all of them at once; if it starts to
      // page, this follows the cursor to the end.
      queryFn: async ({ signal }) => {
        const payouts: Payout[] = [];
        let cursor: string | null = null;
        do {
          // Annotated: the cursor comes from the page and the page from the
          // cursor, and TypeScript won't infer a type that depends on itself.
          const page: PayoutPage = await api("/payouts", {
            schema: PayoutPageSchema,
            query: { cursor },
            signal,
          });
          payouts.push(...page.items);
          cursor = page.next_cursor;
        } while (cursor !== null);
        return payouts;
      },
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
