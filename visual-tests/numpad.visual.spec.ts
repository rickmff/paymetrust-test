import { expect, test, type Locator } from "@playwright/test";
import { box, field, keypad, openKeypad } from "./numpad.helpers";
import { gotoStory } from "./storybook";

// What the keypad looks like, compared with images kept in ./__screenshots__.
// Playwright freezes the picture first: transitions jump to their end and the
// caret is hidden. After an intended change: npm run visual:update, then look
// at the new images before keeping them.

/**
 * The part of the page that holds these elements, with a margin. A screenshot
 * of the keypad element alone would stop at its border and miss its shadow
 * and how it sits against the field.
 */
async function around(...parts: Locator[]) {
  const boxes = await Promise.all(parts.map(box));
  const margin = 16;
  const left = Math.min(...boxes.map((each) => each.x)) - margin;
  const top = Math.min(...boxes.map((each) => each.y)) - margin;
  const right = Math.max(...boxes.map((each) => each.right)) + margin;
  const bottom = Math.max(...boxes.map((each) => each.bottom)) + margin;
  return {
    x: Math.max(0, Math.floor(left)),
    y: Math.max(0, Math.floor(top)),
    width: Math.ceil(right - left),
    height: Math.ceil(bottom - top),
  };
}

test("open", { tag: "@screenshot" }, async ({ page }) => {
  await gotoStory(page, "components-numpad--default");
  await openKeypad(page);

  // The whole field (label, input, help) and its keypad.
  const wholeField = field(page).locator("..");
  await expect(page).toHaveScreenshot("open.png", {
    clip: await around(wholeField, keypad(page)),
  });
});
