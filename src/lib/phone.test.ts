import { expect, test } from "vitest";
import { phoneMask } from "./phone";

test.each([
  ["0701020304", "+2250701020304"],
  ["07 01 02 03 04", "+2250701020304"],
  ["07.01.02.03.04", "+2250701020304"],
  // Copied from a contact: the country code comes along, in either spelling.
  ["+225 07 01 02 03 04", "+2250701020304"],
  ["00225 0701020304", "+2250701020304"],
  ["2250701020304", "+2250701020304"],
  // Still being typed.
  ["07 0", "+225070"],
  // Ten digits and no more.
  ["070102030499", "+2250701020304"],
  ["", ""],
  ["abc", ""],
])("reads %j as %j", (text, value) => {
  expect(phoneMask.parse(text)).toBe(value);
});

test.each([
  ["+2250701020304", "07 01 02 03 04"],
  ["+225070", "07 0"],
  ["+22507", "07"],
  ["", ""],
])("shows %j as %j", (value, text) => {
  expect(phoneMask.format(value)).toBe(text);
});

test("what it shows reads back as the same number", () => {
  const value = "+2250701020304";

  expect(phoneMask.parse(phoneMask.format(value))).toBe(value);
});
