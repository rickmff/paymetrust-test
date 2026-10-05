import { expect, test } from "vitest";
import {
  failedTransaction,
  paidTransaction,
  transactions,
} from "@/test/fixtures";
import { pollDelay } from "./api";
import { TransactionFiltersSchema, TransactionSchema } from "./schemas";

test("accepts each status with the fields that belong to it", () => {
  for (const transaction of transactions) {
    expect(TransactionSchema.safeParse(transaction).success).toBe(true);
  }
});

test("rejects a failed transaction that has no reason", () => {
  const { failure_reason: _, ...withoutReason } = failedTransaction;

  expect(TransactionSchema.safeParse(withoutReason).success).toBe(false);
});

test("rejects a status this version of the app doesn't know", () => {
  const result = TransactionSchema.safeParse({
    ...paidTransaction,
    status: "on_hold",
  });

  expect(result.success).toBe(false);
});

test("rejects an amount sent as a float", () => {
  const result = TransactionSchema.safeParse({
    ...paidTransaction,
    amount: 150.5,
  });

  expect(result.success).toBe(false);
});

test("drops an invalid filter instead of failing the whole page", () => {
  const filters = TransactionFiltersSchema.parse({
    status: "banana",
    operator: "wave",
  });

  expect(filters).toEqual({ status: undefined, operator: "wave" });
});

test("polling backs off and is capped at 30 seconds", () => {
  expect([0, 1, 2, 3, 4, 5].map(pollDelay)).toEqual([
    2_000, 4_000, 8_000, 16_000, 30_000, 30_000,
  ]);
});
