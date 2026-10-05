import { z } from "zod";
import type { StatusMeta } from "@/components/StatusChip";
import { CurrencySchema, MinorUnitsSchema } from "@/lib/money";
import { OperatorSchema } from "@/lib/operators";
import { sortSchema } from "@/lib/sort";

export const TransactionStatusSchema = z.enum([
  "pending",
  "success",
  "failed",
  "reversed",
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

const base = z.object({
  id: z.string(),
  amount: MinorUnitsSchema,
  fee: MinorUnitsSchema,
  net: MinorUnitsSchema,
  currency: CurrencySchema,
  operator: OperatorSchema,
  customer_phone: z.string(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

/**
 * Go sends one struct with optional fields (api/store.go). Here it becomes a
 * discriminated union: each status carries exactly the fields that exist for
 * it, so "failed without a reason" is rejected at the boundary and can't be
 * represented in the app.
 */
export const TransactionSchema = z.discriminatedUnion("status", [
  base.extend({ status: z.literal("pending") }),
  base.extend({ status: z.literal("success"), settled_at: z.iso.datetime() }),
  base.extend({ status: z.literal("failed"), failure_reason: z.string() }),
  base.extend({
    status: z.literal("reversed"),
    settled_at: z.iso.datetime(),
    reversed_at: z.iso.datetime(),
  }),
]);
export type Transaction = z.infer<typeof TransactionSchema>;

/** One label, color and icon per status, used by every screen. */
export const TRANSACTION_STATUS = {
  pending: { label: "Pending", tone: "warning", icon: "◷" },
  success: { label: "Paid", tone: "success", icon: "✓" },
  failed: { label: "Failed", tone: "danger", icon: "✕" },
  reversed: { label: "Reversed", tone: "default", icon: "↺" },
} as const satisfies Record<TransactionStatus, StatusMeta>;

export const TRANSACTION_STATUS_OPTIONS = TransactionStatusSchema.options.map(
  (value) => ({ value, label: TRANSACTION_STATUS[value].label }),
);

/**
 * Filters come from the URL, and the URL is user input: anyone can type
 * ?status=banana. `.catch(undefined)` drops an invalid value instead of
 * crashing the page.
 */
export const TransactionFiltersSchema = z.object({
  status: TransactionStatusSchema.optional().catch(undefined),
  operator: OperatorSchema.optional().catch(undefined),
});
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;

/**
 * The columns the server sorts by. Like filtering, sorting happens there:
 * the list comes in pages, so the browser never holds every row.
 */
export const TransactionSortSchema = sortSchema(["created_at", "amount"]);
export type TransactionSort = NonNullable<
  z.infer<typeof TransactionSortSchema>
>;

/** Newest first: what the list shows when the URL asks for nothing else. */
export const DEFAULT_TRANSACTION_SORT: TransactionSort = {
  column: "created_at",
  direction: "descending",
};
