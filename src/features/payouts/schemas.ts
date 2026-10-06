import { z } from "zod";
import type { StatusMeta } from "@/components/StatusChip";
import { CurrencySchema, MinorUnitsSchema } from "@/lib/money";
import {
  OPERATOR_LABEL,
  OPERATOR_PREFIXES,
  OperatorSchema,
} from "@/lib/operators";
import { sortSchema } from "@/lib/sort";

// ---- what the API returns --------------------------------------------------

export const PayoutStatusSchema = z.enum([
  "pending_approval",
  "approved",
  "rejected",
]);
export type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

const UserRefSchema = z.object({ id: z.string(), name: z.string() });

const base = z.object({
  id: z.string(),
  amount: MinorUnitsSchema,
  fee: MinorUnitsSchema,
  total: MinorUnitsSchema,
  currency: CurrencySchema,
  operator: OperatorSchema,
  recipient_name: z.string(),
  recipient_phone: z.string(),
  reference: z.string(),
  created_by: UserRefSchema,
  created_at: z.iso.datetime(),
});

const decided = {
  decided_by: UserRefSchema,
  decided_at: z.iso.datetime(),
};

export const PayoutSchema = z.discriminatedUnion("status", [
  base.extend({ status: z.literal("pending_approval") }),
  base.extend({ status: z.literal("approved"), ...decided }),
  base.extend({
    status: z.literal("rejected"),
    ...decided,
    decision_reason: z.string(),
  }),
]);
export type Payout = z.infer<typeof PayoutSchema>;

export const PAYOUT_STATUS = {
  pending_approval: { label: "Pending approval", tone: "warning", icon: "◷" },
  approved: { label: "Approved", tone: "success", icon: "✓" },
  rejected: { label: "Rejected", tone: "danger", icon: "✕" },
} as const satisfies Record<PayoutStatus, StatusMeta>;

export const PAYOUT_STATUS_OPTIONS = PayoutStatusSchema.options.map(
  (value) => ({ value, label: PAYOUT_STATUS[value].label }),
);

/** From the URL, so user input: an invalid value is dropped, not an error. */
export const PayoutFiltersSchema = z.object({
  status: PayoutStatusSchema.optional().catch(undefined),
});
export type PayoutFilters = z.infer<typeof PayoutFiltersSchema>;

/**
 * The columns the server sorts by. The list comes in pages, so the browser
 * never holds every row and can't sort them itself.
 */
export const PayoutSortSchema = sortSchema(["id", "amount"]);
export type PayoutSort = NonNullable<z.infer<typeof PayoutSortSchema>>;

/** Ids count up, so this is newest first. */
export const DEFAULT_PAYOUT_SORT: PayoutSort = [
  { column: "id", direction: "descending" },
];

export const QuoteSchema = z.object({
  amount: MinorUnitsSchema,
  fee: MinorUnitsSchema,
  total: MinorUnitsSchema,
  currency: CurrencySchema,
});

// ---- what the user types ---------------------------------------------------
// One schema per wizard step, composed into the full form at the end. Field
// names match the API's request body, so a 422 maps back with no translation.
// These rules are for fast feedback only: api/handlers.go checks them again.

export const PAYOUT_CURRENCY = "XOF";
export const PAYOUT_LIMITS = { min: 500, max: 2_000_000 } as const;

export const RecipientStepSchema = z
  .object({
    operator: z.enum(OperatorSchema.options, "Choose an operator"),
    recipient_name: z
      .string()
      .trim()
      .min(2, "Enter the recipient's full name")
      .max(80, "Keep the name under 80 characters"),
    // Input: whatever the user typed ("+225 07 01 02 03 04").
    // Output: the normalized number the API wants ("+2250701020304").
    recipient_phone: z
      .string()
      .transform((value) => value.replace(/[\s.-]/g, ""))
      .pipe(
        z
          .string()
          .regex(
            /^\+225(01|05|07)\d{8}$/,
            "Use the format +225 07 00 00 00 00",
          ),
      ),
  })
  // A rule that needs two fields at once. `path` puts the message on the phone.
  .superRefine(({ operator, recipient_phone }, context) => {
    if (!OPERATOR_PREFIXES[operator].includes(recipient_phone.slice(4, 6))) {
      context.addIssue({
        code: "custom",
        path: ["recipient_phone"],
        message: `This number is not on ${OPERATOR_LABEL[operator]}`,
      });
    }
  });

export const AmountStepSchema = z.object({
  // An <input> always gives a string, so the form's input type (string) and
  // output type (number) differ on purpose. The text is checked as text before
  // it becomes a number: `Number()` alone also reads "0x1F4" and "1e3".
  amount: z
    .string()
    .transform((text, context) => {
      // Thousands are often typed with spaces ("25 000"), as the hint under
      // the field writes them. An empty field counts as 0, for the rule below.
      const digits = text.replace(/\s/g, "");
      if (/^\d*$/.test(digits)) return Number(digits);

      context.addIssue({
        code: "custom",
        message: /^\d+[.,]\d+$/.test(digits)
          ? "XOF has no cents: use whole francs"
          : "Enter the amount in digits",
      });
      return z.NEVER;
    })
    .pipe(
      z
        .number()
        .positive("Amount must be greater than 0")
        .min(PAYOUT_LIMITS.min, `The minimum is ${PAYOUT_LIMITS.min} F CFA`)
        .max(PAYOUT_LIMITS.max, `The maximum is ${PAYOUT_LIMITS.max} F CFA`),
    ),
  reference: z.string().trim().max(140, "Keep it under 140 characters"),
});

export const PayoutFormSchema = RecipientStepSchema.and(AmountStepSchema);
/** What the form holds while typing (amount is text). */
export type PayoutFormInput = z.input<typeof PayoutFormSchema>;
/** What comes out after validation (amount is a number, phone is normalized). */
export type PayoutFormValues = z.output<typeof PayoutFormSchema>;

export const RejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Explain the rejection in at least 5 characters"),
});
