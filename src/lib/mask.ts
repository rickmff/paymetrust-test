/**
 * For a value that is shown differently from how it is stored: a phone number
 * is "+2250701020304" for the form and "07 01 02 03 04" on screen.
 */
export type Mask = {
  /** What the form holds -> what the input shows. */
  format: (value: string) => string;
  /** What the input holds after an edit -> what the form holds. */
  parse: (text: string) => string;
};

/**
 * Runs after every edit of a masked input: puts what the input shows back in
 * the mask's format, leaves the caret where the user had it, and returns the
 * value for the form.
 *
 * `previous` is the form's value before the edit, and `edit` the browser's
 * `input` event: it says what kind of edit this was.
 */
export function applyMask(
  mask: Mask,
  input: HTMLInputElement,
  previous: string,
  edit: Event,
): string {
  const inputType = edit instanceof InputEvent ? edit.inputType : undefined;
  let text = input.value;
  let caret = input.selectionStart ?? text.length;

  // Backspace or Delete on a separator alone removes nothing the form holds,
  // and the mask would put the separator right back. The character next to
  // it goes instead.
  if (mask.parse(text) === previous) {
    if (inputType === "deleteContentBackward" && caret > 0) {
      text = text.slice(0, caret - 1) + text.slice(caret);
      caret -= 1;
    } else if (inputType === "deleteContentForward") {
      text = text.slice(0, caret) + text.slice(caret + 1);
    }
  }

  const value = mask.parse(text);
  const shown = mask.format(value);
  // The caret stays after the same characters: what the mask makes of the
  // text in front of it says where that is.
  caret = mask.format(mask.parse(text.slice(0, caret))).length;

  // Written here and not left to React: when React rewrites the value of an
  // input, the caret jumps to the end.
  if (input.value !== shown) input.value = shown;
  input.setSelectionRange(caret, caret);
  return value;
}
