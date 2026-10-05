import { afterEach, expect, test, vi } from "vitest";
import { deleteBackward, insertText } from "./editing";

// jsdom has no editing command (document.execCommand), so most of this file
// exercises the edit done by hand. The last tests put a fake command in.

type Setup = Partial<
  Pick<HTMLInputElement, "type" | "maxLength" | "readOnly" | "disabled">
>;

/** A focused input in the page, holding `value`, with the caret placed. */
function inputWith(
  value: string,
  [start, end = start]: [number, number?] = [value.length],
  setup: Setup = {},
) {
  const input = Object.assign(document.createElement("input"), setup);
  input.value = value;
  document.body.append(input);
  input.focus();
  // type="number" has no caret to place.
  if (input.selectionStart !== null) input.setSelectionRange(start, end);
  return input;
}

const caret = (input: HTMLInputElement) => [
  input.selectionStart,
  input.selectionEnd,
];

/** Every beforeinput / input event the element fires, in order. */
function recordEvents(input: HTMLInputElement) {
  const events: string[] = [];
  for (const type of ["beforeinput", "input"]) {
    input.addEventListener(type, (event) => {
      const { inputType, data } = event as InputEvent;
      events.push(`${type} ${inputType} ${String(data)}`);
    });
  }
  return events;
}

afterEach(() => {
  document.body.replaceChildren();
  Reflect.deleteProperty(document, "execCommand");
});

test("types at the caret and leaves the caret after the new text", () => {
  const input = inputWith("15", [1]);

  expect(insertText(input, "9")).toBe(true);

  expect(input.value).toBe("195");
  expect(caret(input)).toEqual([2, 2]);
});

test("types more than one character at once", () => {
  const input = inputWith("5");

  insertText(input, "000");

  expect(input.value).toBe("5000");
  expect(caret(input)).toEqual([4, 4]);
});

test("replaces the selected text", () => {
  const input = inputWith("5000", [1, 4]);

  insertText(input, "7");

  expect(input.value).toBe("57");
  expect(caret(input)).toEqual([2, 2]);
});

test("backspace deletes the character before the caret", () => {
  const input = inputWith("195", [2]);

  expect(deleteBackward(input)).toBe(true);

  expect(input.value).toBe("15");
  expect(caret(input)).toEqual([1, 1]);
});

test("backspace deletes the selection, whatever its size", () => {
  const input = inputWith("5000", [1, 3]);

  deleteBackward(input);

  expect(input.value).toBe("50");
  expect(caret(input)).toEqual([1, 1]);
});

test("backspace at the start changes nothing and says so", () => {
  const input = inputWith("5000", [0]);
  const events = recordEvents(input);

  expect(deleteBackward(input)).toBe(false);

  expect(input.value).toBe("5000");
  expect(events).toEqual([]);
});

test("backspace deletes a character made of two code units whole", () => {
  const input = inputWith("1💶");

  deleteBackward(input);

  expect(input.value).toBe("1");
});

test("fires what a keystroke fires: a cancelable beforeinput, then input", () => {
  const input = inputWith("1");
  const events = recordEvents(input);

  insertText(input, "2");
  deleteBackward(input);

  expect(events).toEqual([
    "beforeinput insertText 2",
    "input insertText 2",
    "beforeinput deleteContentBackward null",
    "input deleteContentBackward null",
  ]);
});

test("a listener that cancels beforeinput stops the edit", () => {
  const input = inputWith("1");
  input.addEventListener("beforeinput", (event) => event.preventDefault());

  expect(insertText(input, "2")).toBe(false);

  expect(input.value).toBe("1");
});

test("cuts what does not fit maxlength, as a browser does with typed text", () => {
  const input = inputWith("12", [2], { maxLength: 4 });

  expect(insertText(input, "000")).toBe(true);
  expect(input.value).toBe("1200");

  // Full: nothing more goes in, unless it replaces a selection.
  expect(insertText(input, "9")).toBe(false);
  input.setSelectionRange(0, 4);
  expect(insertText(input, "9")).toBe(true);
  expect(input.value).toBe("9");
});

test.each([
  ["read-only", { readOnly: true }],
  ["disabled", { disabled: true }],
] as const)("leaves a %s input alone", (_name, setup) => {
  const input = inputWith("5000", [4], setup);

  expect(insertText(input, "1")).toBe(false);
  expect(deleteBackward(input)).toBe(false);

  expect(input.value).toBe("5000");
});

test("leaves an input alone when a fieldset above it is disabled", () => {
  const input = inputWith("5000");
  const fieldset = document.createElement("fieldset");
  fieldset.disabled = true;
  document.body.append(fieldset);
  fieldset.append(input);

  expect(insertText(input, "1")).toBe(false);
});

test("edits a type=number input at its end, where there is no caret to ask for", () => {
  const input = inputWith("12", [2], { type: "number" });

  insertText(input, "5");
  expect(input.value).toBe("125");

  deleteBackward(input);
  deleteBackward(input);
  expect(input.value).toBe("1");
});

// ---- with the browser's editing command --------------------------------------

/** Installs a stand-in for document.execCommand. */
function withCommand(run: (command: string, text?: string) => boolean) {
  const execCommand = vi.fn((command: string, _ui?: boolean, text?: string) =>
    run(command, text),
  );
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
  return execCommand;
}

/** What a real command does when it works: change the value, fire `input`. */
function typeLikeTheBrowser(input: HTMLInputElement, text: string) {
  input.setRangeText(text, input.value.length, input.value.length, "end");
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

test("prefers the browser's editing command: it keeps undo working", () => {
  const input = inputWith("5");
  const execCommand = withCommand((_command, text = "") => {
    typeLikeTheBrowser(input, text);
    return true;
  });
  const events = recordEvents(input);

  expect(insertText(input, "0")).toBe(true);

  expect(execCommand).toHaveBeenCalledWith("insertText", false, "0");
  expect(input.value).toBe("50");
  // Once, by the command: the edit was not done a second time by hand.
  expect(events).toHaveLength(1);
});

test("backspace uses the command named delete", () => {
  const input = inputWith("50");
  const execCommand = withCommand(() => false);

  deleteBackward(input);

  expect(execCommand).toHaveBeenCalledWith("delete");
});

test("takes the command's no for an answer", () => {
  // It ran and changed nothing: this is a full field, for instance.
  const input = inputWith("5000");
  withCommand(() => true);

  expect(insertText(input, "1")).toBe(false);

  expect(input.value).toBe("5000");
});

test("edits by hand when the command cannot run", () => {
  const input = inputWith("5");
  withCommand(() => false);

  expect(insertText(input, "0")).toBe(true);

  expect(input.value).toBe("50");
});

test("never runs the command while another element has the focus", () => {
  // The command types into whatever is focused: here, the wrong input.
  const input = inputWith("5");
  const other = inputWith("");
  const execCommand = withCommand(() => true);

  expect(insertText(input, "0")).toBe(true);

  expect(execCommand).not.toHaveBeenCalled();
  expect(input.value).toBe("50");
  expect(other.value).toBe("");
});
