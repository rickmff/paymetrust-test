import { expect, type Page } from "@playwright/test";

/**
 * Opens one story on its own (no Storybook UI around it) and waits until
 * Storybook reports that it has rendered.
 *
 * The id comes from the story's title and export name:
 * "Components/Numpad" + `InAForm` -> "components-numpad--in-a-form".
 */
export async function gotoStory(page: Page, id: string) {
  await page.goto(`/iframe.html?viewMode=story&id=${id}`);

  // Storybook keeps the current render on window.__STORYBOOK_PREVIEW__. Its
  // phase ends at "finished", or stops at "errored". The body classes cover a
  // story that could not be rendered at all (wrong id, import error).
  const outcome = await page.waitForFunction(() => {
    const body = document.body.classList;
    if (body.contains("sb-show-errordisplay")) return "failed";
    if (body.contains("sb-show-nopreview")) return "missing";
    const preview = (
      window as unknown as {
        __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } };
      }
    ).__STORYBOOK_PREVIEW__;
    const phase = preview?.currentRender?.phase;
    if (phase === "errored") return "failed";
    return phase === "finished" && body.contains("sb-show-main") ? "ok" : false;
  });
  expect(await outcome.jsonValue(), `story "${id}"`).toBe("ok");

  // Text drawn with a fallback font would be a different picture.
  await page.evaluate(() => document.fonts.ready);
}
