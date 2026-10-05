import { expect, test } from "vitest";
import { sortRows, sortSchema, toSortParam } from "./sort";

const SortSchema = sortSchema(["created_at", "amount"]);

test("reads a sort from its URL form, and writes the same form back", () => {
  const ascending = { column: "amount", direction: "ascending" } as const;
  const descending = { column: "amount", direction: "descending" } as const;

  expect(SortSchema.parse("amount")).toEqual(ascending);
  expect(SortSchema.parse("-amount")).toEqual(descending);
  expect(toSortParam(ascending)).toBe("amount");
  expect(toSortParam(descending)).toBe("-amount");
});

test("drops a sort the list can't do instead of failing the whole page", () => {
  for (const param of ["status", "-banana", "-", "", undefined, null, 42]) {
    expect(SortSchema.parse(param)).toBeUndefined();
  }
});

test("sorts numbers by value, in either direction", () => {
  const rows = [{ amount: 9000 }, { amount: 150000 }, { amount: 42000 }];
  const amount = (row: { amount: number }) => row.amount;

  expect(sortRows(rows, "ascending", amount).map(amount)).toEqual([
    9000, 42000, 150000,
  ]);
  expect(sortRows(rows, "descending", amount).map(amount)).toEqual([
    150000, 42000, 9000,
  ]);
});

test("sorts text the way a person reads it: digits as numbers, accents ignored", () => {
  const text = (value: string) => value;

  // As plain strings, "PO-1000" would come before "PO-999".
  expect(sortRows(["PO-1000", "PO-999"], "ascending", text)).toEqual([
    "PO-999",
    "PO-1000",
  ]);
  expect(sortRows(["Yao", "Koné", "aminata"], "ascending", text)).toEqual([
    "aminata",
    "Koné",
    "Yao",
  ]);
});

test("leaves the list it was given alone, and keeps ties in their order", () => {
  const rows = [
    { id: "b", amount: 500 },
    { id: "a", amount: 500 },
    { id: "c", amount: 100 },
  ];

  const sorted = sortRows(rows, "descending", (row) => row.amount);

  expect(sorted.map((row) => row.id)).toEqual(["b", "a", "c"]);
  expect(rows.map((row) => row.id)).toEqual(["b", "a", "c"]);
});
