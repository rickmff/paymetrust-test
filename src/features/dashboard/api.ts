import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { TransactionStatusSchema } from "@/features/transactions/schemas";
import { api } from "@/lib/api";
import { CurrencySchema, MinorUnitsSchema } from "@/lib/money";

const SummarySchema = z.object({
  currency: CurrencySchema,
  collected: MinorUnitsSchema,
  /** A ratio between 0 and 1. A ratio may be a float; money may not. */
  success_rate: z.number().min(0).max(1),
  // z.record over an enum is exhaustive: every status must be present.
  transactions: z.record(TransactionStatusSchema, z.number().int()),
  payouts_pending_approval: z.number().int(),
});

export const summaryQuery = queryOptions({
  queryKey: ["summary"],
  queryFn: ({ signal }) => api("/summary", { schema: SummarySchema, signal }),
});
