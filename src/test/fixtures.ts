import type { z } from "zod";
import type { UserSchema } from "@/features/auth/schemas";
import type { PayoutSchema } from "@/features/payouts/schemas";
import type { TransactionSchema } from "@/features/transactions/schemas";

// Fixtures are what travels on the wire, so they use the schemas' *input*
// types: plain JSON numbers, before Zod brands them as money.
type UserJson = z.input<typeof UserSchema>;
type TransactionJson = z.input<typeof TransactionSchema>;
type PayoutJson = z.input<typeof PayoutSchema>;

/** One user per role. Tests render the same screen as each of them. */
export const users = {
  viewer: {
    id: "usr_viewer",
    name: "Fatou Diallo",
    email: "viewer@demo.test",
    role: "viewer",
    permissions: ["transaction:read", "payout:read"],
  },
  maker: {
    id: "usr_maker",
    name: "Kofi Mensah",
    email: "maker@demo.test",
    role: "maker",
    permissions: ["transaction:read", "payout:read", "payout:create"],
  },
  approver: {
    id: "usr_approver",
    name: "Awa Koné",
    email: "approver@demo.test",
    role: "approver",
    permissions: [
      "transaction:read",
      "payout:read",
      "payout:create",
      "payout:approve",
    ],
  },
} satisfies Record<string, UserJson>;

export type Role = keyof typeof users;

const transactionBase = {
  currency: "XOF",
  operator: "wave",
  customer_phone: "+2250701020304",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:02:00Z",
} as const;

// Named, not indexed: with noUncheckedIndexedAccess, `transactions[0]` is
// "maybe undefined". A name is also easier to read in a test.
export const paidTransaction = {
  ...transactionBase,
  id: "PAY-1042",
  amount: 15000,
  fee: 225,
  net: 14775,
  status: "success",
  settled_at: "2026-10-01T10:02:00Z",
} satisfies TransactionJson;

export const pendingTransaction = {
  ...transactionBase,
  id: "PAY-1041",
  amount: 2000,
  fee: 30,
  net: 1970,
  operator: "mtn_momo",
  status: "pending",
} satisfies TransactionJson;

export const failedTransaction = {
  ...transactionBase,
  id: "PAY-1040",
  amount: 5000,
  fee: 75,
  net: 4925,
  operator: "orange_money",
  status: "failed",
  failure_reason: "Insufficient balance",
} satisfies TransactionJson;

export const transactions: TransactionJson[] = [
  paidTransaction,
  pendingTransaction,
  failedTransaction,
];

const payoutBase = {
  currency: "XOF",
  created_at: "2026-10-01T09:00:00Z",
} as const;

/** Created by the maker: the approver may decide it. */
export const pendingPayout = {
  ...payoutBase,
  id: "PO-2004",
  amount: 60000,
  fee: 600,
  total: 60600,
  operator: "moov_money",
  recipient_name: "Aminata Bamba",
  recipient_phone: "+2250102030405",
  reference: "Supplier, October",
  status: "pending_approval",
  created_by: { id: users.maker.id, name: users.maker.name },
} satisfies PayoutJson;

/** Created by the approver herself: she may not decide it. */
export const ownPayout = {
  ...payoutBase,
  id: "PO-2003",
  amount: 9000,
  fee: 100,
  total: 9100,
  operator: "wave",
  recipient_name: "Yao Kouassi",
  recipient_phone: "+2250709080706",
  reference: "Driver bonus",
  status: "pending_approval",
  created_by: { id: users.approver.id, name: users.approver.name },
} satisfies PayoutJson;

export const payouts: PayoutJson[] = [pendingPayout, ownPayout];

/** PO-2004 after Awa approves it. */
export const approvedPayout = {
  ...pendingPayout,
  status: "approved",
  decided_by: { id: users.approver.id, name: users.approver.name },
  decided_at: "2026-10-01T09:30:00Z",
} satisfies PayoutJson;

export const summary = {
  currency: "XOF",
  collected: 14775,
  success_rate: 0.5,
  transactions: { pending: 1, success: 1, failed: 1, reversed: 0 },
  payouts_pending_approval: 2,
};
