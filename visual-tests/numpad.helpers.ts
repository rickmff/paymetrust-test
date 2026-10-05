import { expect, type Locator, type Page } from "@playwright/test";

// How to find and drive the keypad in a story. If a label or the markup
// changes, this file changes and the tests don't.

export const keypad = (page: Page) =>
  page.getByRole("group", { name: "Numeric keypad" });

/**
 * The keypad whether or not it can be seen. Roles only find what is exposed
 * to assistive technology, and a keypad waiting out of sight is not.
 */
export const keypadElement = (page: Page) =>
  page.locator('[data-slot="numpad"]');

export const field = (page: Page, label = "Amount (F CFA)") =>
  page.getByLabel(label, { exact: true });

export const key = (page: Page, name: string) =>
  keypad(page).getByRole("button", { name, exact: true });

/** The gap the component leaves between the field and the keypad. */
export const GAP = 6;

/**
 * Waits for the keypad to be open and done with its opening transition.
 * Until then its box is still growing, and a click aimed at a key can make
 * Playwright scroll the page to "find" it.
 */
export async function keypadReady(page: Page) {
  await expect(keypad(page)).toBeVisible();
  await keypad(page).evaluate((panel) =>
    Promise.allSettled(
      panel.getAnimations({ subtree: true }).map((each) => each.finished),
    ),
  );
}

/** Clicks the field, as a mouse user would, and waits for its keypad. */
export async function openKeypad(page: Page, label?: string) {
  await field(page, label).click();
  await keypadReady(page);
}

/** Where an element is on screen. Fails loudly if it is not rendered. */
export async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error(`Not on screen: ${String(locator)}`);
  return { ...rect, right: rect.x + rect.width, bottom: rect.y + rect.height };
}
