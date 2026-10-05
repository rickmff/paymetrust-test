/**
 * Typing into an <input> from code, as if a key had been pressed.
 *
 * The keypad is a second keyboard for a focused input. Whatever it does has
 * to look like a keystroke to React, to React Hook Form and to the user: one
 * `input` event, the caret where typing would leave it, undo still working.
 */

type Edit =
  | { inputType: "insertText"; text: string }
  | { inputType: "deleteContentBackward" };

/** False for a read-only, disabled or detached input: nothing to type into. */
export function isEditable(input: HTMLInputElement): boolean {
  // `:disabled` also sees a <fieldset disabled> above the input.
  return input.isConnected && !input.readOnly && !input.matches(":disabled");
}

/** Types `text` at the caret, replacing the selection. True if the value changed. */
export function insertText(input: HTMLInputElement, text: string): boolean {
  if (text === "") return false;
  const changed = edit(input, { inputType: "insertText", text });
  if (changed) revealCaret(input);
  return changed;
}

/** Deletes the selection, or the character before the caret. True if the value changed. */
export function deleteBackward(input: HTMLInputElement): boolean {
  return edit(input, { inputType: "deleteContentBackward" });
}

function edit(input: HTMLInputElement, change: Edit): boolean {
  if (!isEditable(input)) return false;
  const outcome = editWithCommand(input, change);
  return outcome === "unavailable"
    ? editByHand(input, change)
    : outcome === "applied";
}

/**
 * The browser's own editing command: the code path of a real keystroke. It is
 * the only way to edit that keeps the native undo stack and enforces
 * `maxlength`. `execCommand` is deprecated, but nothing replaces it for this
 * and every engine ships it; where it is missing we edit by hand instead.
 */
function editWithCommand(
  input: HTMLInputElement,
  change: Edit,
): "applied" | "refused" | "unavailable" {
  const doc = input.ownerDocument;
  // The command edits whatever has focus, so it is only safe on our input.
  if (typeof doc.execCommand !== "function" || !hasFocus(input)) {
    return "unavailable";
  }

  // The return value can't be trusted: it is `true` for an edit that
  // `maxlength` refused. The `input` event is what says the value changed.
  let applied = false;
  let cancelled = false;
  const onInput = () => {
    applied = true;
  };
  // On the window, so it runs after every listener that may cancel the edit.
  const onBeforeInput = (event: Event) => {
    cancelled = event.defaultPrevented;
  };
  const view = doc.defaultView;
  input.addEventListener("input", onInput);
  view?.addEventListener("beforeinput", onBeforeInput);
  let ran = false;
  try {
    ran =
      change.inputType === "insertText"
        ? doc.execCommand("insertText", false, change.text)
        : doc.execCommand("delete");
  } finally {
    input.removeEventListener("input", onInput);
    view?.removeEventListener("beforeinput", onBeforeInput);
  }

  if (applied) return "applied";
  // It ran and changed nothing: the field is full, there is nothing to
  // delete, or a listener said no. Editing by hand would overrule that.
  return ran || cancelled ? "refused" : "unavailable";
}

/**
 * The same edit without the command, for when it cannot run (jsdom has none;
 * a browser refuses it while the input is not focused). The value and the
 * caret end up the same; only the undo history is not kept.
 */
function editByHand(input: HTMLInputElement, change: Edit): boolean {
  const { value } = input;
  // `type="number"` has no selection: edit at the end, as best effort.
  const hasSelection = input.selectionStart !== null;
  let start = input.selectionStart ?? value.length;
  const end = input.selectionEnd ?? value.length;
  let text = "";

  if (change.inputType === "insertText") {
    text = fitMaxLength(input, change.text, end - start);
    if (text === "") return false;
  } else if (start === end) {
    if (start === 0) return false;
    start -= endsWithSurrogatePair(value.slice(0, start)) ? 2 : 1;
  }

  const init = {
    bubbles: true,
    composed: true,
    inputType: change.inputType,
    data: change.inputType === "insertText" ? text : null,
  };
  // A keystroke can be cancelled in `beforeinput`: give listeners that chance.
  const allowed = input.dispatchEvent(
    new InputEvent("beforeinput", { ...init, cancelable: true }),
  );
  if (!allowed) return false;

  if (hasSelection) {
    input.setRangeText(text, start, end, "end");
  } else {
    setValue(input, value.slice(0, start) + text + value.slice(end));
  }
  // React calls onChange when an `input` event arrives and the value is not
  // the one it last wrote. Neither write above goes through the setter React
  // watches, so it sees the difference.
  input.dispatchEvent(new InputEvent("input", init));
  return true;
}

/** Whether the input is the focused element, inside a shadow tree as well. */
export function hasFocus(input: HTMLInputElement): boolean {
  const root = input.getRootNode();
  return (
    (root instanceof Document || root instanceof ShadowRoot) &&
    root.activeElement === input
  );
}

/** What a browser does with typed text that doesn't fit `maxlength`: cut it. */
function fitMaxLength(
  input: HTMLInputElement,
  text: string,
  selected: number,
): string {
  if (input.maxLength < 0) return text;
  const room = input.maxLength - (input.value.length - selected);
  return text.slice(0, Math.max(0, room));
}

/** One character made of two code units (an emoji) is deleted whole. */
function endsWithSurrogatePair(text: string): boolean {
  return /[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(text);
}

/** Writes the value past the setter React installs on the element itself. */
function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
}

/**
 * A keystroke scrolls the text so the caret stays in view; the editing
 * command doesn't (Chromium, WebKit). This covers the usual case: typing at
 * the end of a value wider than its input.
 */
function revealCaret(input: HTMLInputElement) {
  if (input.selectionEnd !== input.value.length) return;
  if (input.scrollWidth <= input.clientWidth) return;
  const rtl = getComputedStyle(input).direction === "rtl";
  input.scrollLeft = rtl ? -input.scrollWidth : input.scrollWidth;
}
