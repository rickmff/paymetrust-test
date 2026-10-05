import { expect, test } from "@playwright/test";
import {
  box,
  field,
  GAP,
  key,
  keypad,
  keypadElement,
  openKeypad,
} from "./numpad.helpers";
import { gotoStory } from "./storybook";

// The behaviour that only a real browser has: focus, pointer events, the
// caret and layout. The rules themselves (what opens and closes the keypad)
// are unit-tested in src/components/numpad/Numpad.test.tsx.

test.beforeEach(async ({ page }) => {
  await gotoStory(page, "components-numpad--default");
});

test("a mouse click on the field opens it right under the field", async ({
  page,
}) => {
  await expect(keypad(page)).toBeHidden();

  await openKeypad(page);

  const input = await box(field(page));
  const pad = await box(keypad(page));
  expect(pad.x).toBeCloseTo(input.x, 0);
  expect(pad.y).toBeCloseTo(input.bottom + GAP, 0);
});

test("keyboard focus does not open it", async ({ page }) => {
  await page.keyboard.press("Tab");

  await expect(field(page)).toBeFocused();
  await expect(keypad(page)).toBeHidden();
});

test("keys type at the caret and the field keeps the focus", async ({
  page,
}) => {
  await openKeypad(page);
  await page.keyboard.type("15");
  await page.keyboard.press("ArrowLeft");

  await key(page, "9").click();
  await expect(field(page)).toHaveValue("195");
  await expect(field(page)).toBeFocused();

  // The keyboard carries on from where the key left the caret.
  await page.keyboard.type("0");
  await expect(field(page)).toHaveValue("1905");
});

test("Escape closes it and leaves the caret in the field", async ({ page }) => {
  await openKeypad(page);
  await key(page, "5").click();

  await page.keyboard.press("Escape");

  // Not only invisible: gone from the page once its transition has ended.
  await expect(keypadElement(page)).toHaveCount(0);
  await expect(field(page)).toBeFocused();
  await page.keyboard.type("0");
  await expect(field(page)).toHaveValue("50");
});

test("the confirm key closes it and leaves the caret in the field", async ({
  page,
}) => {
  await openKeypad(page);
  await key(page, "5").click();

  await key(page, "Confirm").click();

  await expect(keypadElement(page)).toHaveCount(0);
  await expect(field(page)).toBeFocused();
  await page.keyboard.type("0");
  await expect(field(page)).toHaveValue("50");
});

test("a click anywhere else closes it", async ({ page }) => {
  await openKeypad(page);

  await page.mouse.click(600, 500);

  await expect(keypadElement(page)).toHaveCount(0);
});
