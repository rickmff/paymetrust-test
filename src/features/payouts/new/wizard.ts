import { useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { useOutletContext } from "react-router";
import { z } from "zod";
import type { ApiFieldError } from "@/lib/api";
import { OperatorSchema } from "@/lib/operators";
import {
  RecipientStepSchema,
  type PayoutFormInput,
  type PayoutFormValues,
} from "../schemas";

export const STEPS = ["recipient", "amount", "review"] as const;
export type Step = (typeof STEPS)[number];

export const STEP_LABEL = {
  recipient: "Recipient",
  amount: "Amount",
  review: "Review",
} as const satisfies Record<Step, string>;

export const stepPath = (step: Step) => `/payouts/new/${step}`;

/** Which step owns each field. Adding a form field without placing it here won't compile. */
const STEP_OF_FIELD = {
  operator: "recipient",
  recipient_name: "recipient",
  recipient_phone: "recipient",
  amount: "amount",
  reference: "amount",
} as const satisfies Record<keyof PayoutFormValues, Step>;

// ---- draft -----------------------------------------------------------------

const STORAGE_KEY = "payout-draft";

/**
 * What the wizard has collected so far. sessionStorage is outside input (the
 * user can edit it, an old build may have written it), so it is parsed.
 * Never put a PIN, an OTP or a token in a draft.
 */
const DraftSchema = z.object({
  // Born with the draft, not with the click on "Create": a retry, a double
  // click or a refresh all resend the same key, so the payout is created once.
  // It is replaced only when the draft's values change (see `save`).
  idempotencyKey: z.uuid(),
  operator: OperatorSchema.optional(),
  recipient_name: z.string().optional(),
  recipient_phone: z.string().optional(),
  amount: z.number().optional(),
  reference: z.string().optional(),
});
export type PayoutDraft = z.infer<typeof DraftSchema>;

function readDraft(): PayoutDraft {
  try {
    const stored: unknown = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? "null",
    );
    return DraftSchema.parse(stored);
  } catch {
    return { idempotencyKey: crypto.randomUUID() };
  }
}

export function useDraft() {
  const [draft, setDraft] = useState(readDraft);

  function save(values: Partial<PayoutFormValues>) {
    let next = { ...draft, ...values };
    // The key stands for one payout, as the user reviewed it. Another amount
    // or recipient is another payout and needs a key of its own: under the old
    // key, a server that did create the first one would answer with it again,
    // and the user would see "created" for values they have since changed.
    // A step saved unchanged keeps the key, so a plain retry is still safe.
    if (JSON.stringify(next) !== JSON.stringify(draft)) {
      next = { ...next, idempotencyKey: crypto.randomUUID() };
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setDraft(next);
  }

  /** Call right before leaving the wizard (created or cancelled). */
  function discard() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return { draft, save, discard };
}

/** The first step that still needs input, or null when the draft is complete. */
export function firstIncompleteStep(draft: PayoutDraft): Step | null {
  if (!RecipientStepSchema.safeParse(draft).success) return "recipient";
  if (draft.amount === undefined) return "amount";
  return null;
}

// ---- server errors ---------------------------------------------------------

export type ServerErrors = FieldErrors<PayoutFormInput>;

function isFormField(field: string): field is keyof PayoutFormValues {
  return field in STEP_OF_FIELD;
}

/** Turns the API's 422 into React Hook Form errors, plus the step to show them on. */
export function fromServer(fieldErrors: readonly ApiFieldError[]) {
  const errors: ServerErrors = {};
  let step: Step | null = null;

  for (const { field, message } of fieldErrors) {
    if (!isFormField(field)) continue;
    errors[field] = { type: "server", message };
    step ??= STEP_OF_FIELD[field];
  }
  return { errors, step };
}

// ---- what the layout route shares with its steps -----------------------------

export type PayoutWizard = {
  draft: PayoutDraft;
  /** Stores a finished step. */
  saveStep: (values: Partial<PayoutFormValues>) => void;
  discard: () => void;
  serverErrors: ServerErrors | undefined;
  setServerErrors: (errors: ServerErrors) => void;
};

// `useOutletContext<T>()` is an unchecked cast. Keeping it in one hook, next to
// the type the layout provides, is what makes it safe.
export const usePayoutWizard = () => useOutletContext<PayoutWizard>();
