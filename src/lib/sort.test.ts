import { expect, test } from "vitest";
import { nextSort, sortSchema, toSortParam, type Sort } from "./sort";

const SortSchema = sortSchema(["created_at", "amount"]);

const ascending = { column: "amount", direction: "ascending" } as const;
const descending = { column: "amount", direction: "descending" } as const;
const newestFirst = { column: "created_at", direction: "descending" } as const;
const oldestFirst = { column: "created_at", direction: "ascending" } as const;

test("reads a sort from its URL form, and writes the same form back", () => {
  expect(SortSchema.parse("amount")).toEqual([ascending]);
  expect(SortSchema.parse("-amount")).toEqual([descending]);
  expect(toSortParam([ascending])).toBe("amount");
  expect(toSortParam([descending])).toBe("-amount");
});

test("reads a combined sort in the order it was written", () => {
  expect(SortSchema.parse("-amount,created_at")).toEqual([
    descending,
    oldestFirst,
  ]);
  expect(toSortParam([descending, oldestFirst])).toBe("-amount,created_at");
});

test("drops a sort the list can't do instead of failing the whole page", () => {
  for (const param of ["status", "-banana", "-", "", undefined, null, 42]) {
    expect(SortSchema.parse(param)).toBeUndefined();
  }
});

test("keeps the terms it can read when another one is wrong or repeated", () => {
  expect(SortSchema.parse("status,-amount")).toEqual([descending]);
  expect(SortSchema.parse("amount,,-created_at")).toEqual([
    ascending,
    newestFirst,
  ]);
  // The first mention of a column wins: one column can't go both ways.
  expect(SortSchema.parse("amount,-amount")).toEqual([ascending]);
});

test("picking a column alone sorts by it, and again turns it around", () => {
  const alone = (sort: Sort, column: string) => nextSort(sort, column, false);

  expect(alone([newestFirst], "amount")).toEqual([ascending]);
  expect(alone([ascending], "amount")).toEqual([descending]);
  expect(alone([descending], "amount")).toEqual([ascending]);
  // The other terms of a combined sort go.
  expect(alone([ascending, newestFirst], "amount")).toEqual([descending]);
});

test("combining a column adds it, turns it around, then takes it out", () => {
  const combine = (sort: Sort, column: string) => nextSort(sort, column, true);

  expect(combine([descending], "created_at")).toEqual([
    descending,
    oldestFirst,
  ]);
  // It keeps its place: the order of the terms is the order they were added.
  expect(combine([oldestFirst, descending], "created_at")).toEqual([
    newestFirst,
    descending,
  ]);
  expect(combine([newestFirst, descending], "created_at")).toEqual([
    descending,
  ]);
  // Nothing left: the list goes back to its default order.
  expect(combine([descending], "amount")).toEqual([]);
});
