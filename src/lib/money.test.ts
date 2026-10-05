import { expect, test } from "vitest";
import { formatMoney, MinorUnitsSchema, toMinorUnits } from "./money";

// Unit tests: pure logic, no React, no network.
// Intl separates groups with a narrow no-break space, hence \s in the patterns.

test("formats XOF without decimals, because the currency has none", () => {
  const amount = toMinorUnits(1500, "XOF");

  expect(formatMoney(amount, "XOF")).toMatch(/^1\s500\sF\sCFA$/);
});

test("formats a currency with cents by dividing the minor units", () => {
  const amount = MinorUnitsSchema.parse(1550);

  expect(formatMoney(amount, "GHS")).toMatch(/^15,50\sGHS$/);
});

test("converts typed amounts to integers, without float noise", () => {
  // 19.99 * 100 is 1998.9999999999998 in floating point.
  expect(toMinorUnits(19.99, "GHS")).toBe(1999);
  expect(toMinorUnits(5000, "XOF")).toBe(5000);
});

test("refuses decimals the currency doesn't have, instead of rounding them away", () => {
  expect(() => toMinorUnits(1.005, "GHS")).toThrow(RangeError);
  expect(() => toMinorUnits(12.5, "XOF")).toThrow(RangeError);
});

test("rejects money that is not an integer", () => {
  expect(MinorUnitsSchema.safeParse(10.5).success).toBe(false);
});

test("a plain number is not accepted as money (checked by the compiler)", () => {
  // @ts-expect-error If the brand is ever removed, this line stops being an
  // error and `tsc` fails here.
  formatMoney(1500, "XOF");
});
