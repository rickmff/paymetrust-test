import { expect, test } from "vitest";
import { phoneMask } from "@/lib/phone";
import { applyMask } from "./mask";

// What a mask gets wrong is the caret. Each case is the input right after an
// edit, as the browser left it, with "|" for the caret.

function afterEdit(left: string, previous: string, inputType: string) {
  const input = document.createElement("input");
  const caret = left.indexOf("|");
  input.value = left.replace("|", "");
  input.setSelectionRange(caret, caret);

  const value = applyMask(
    phoneMask,
    input,
    previous,
    new InputEvent("input", { inputType }),
  );

  const at = input.selectionStart ?? 0;
  const shown = `${input.value.slice(0, at)}|${input.value.slice(at)}`;
  return { value, shown };
}

test.each([
  {
    edit: "a digit that starts a new pair",
    left: "070|",
    previous: "+22507",
    inputType: "insertText",
    value: "+225070",
    shown: "07 0|",
  },
  {
    edit: "a digit in the middle",
    left: "07 09|1 02",
    previous: "+225070102",
    inputType: "insertText",
    value: "+2250709102",
    shown: "07 09| 10 2",
  },
  {
    edit: "a character that is not a digit",
    left: "07a|",
    previous: "+22507",
    inputType: "insertText",
    value: "+22507",
    shown: "07|",
  },
  {
    edit: "a number pasted with its country code",
    left: "+225 07 01 02 03 04|",
    previous: "",
    inputType: "insertFromPaste",
    value: "+2250701020304",
    shown: "07 01 02 03 04|",
  },
  {
    edit: "Backspace after a space: the digit before it goes",
    left: "07|01",
    previous: "+2250701",
    inputType: "deleteContentBackward",
    value: "+225001",
    shown: "0|0 1",
  },
  {
    edit: "Delete before a space: the digit after it goes",
    left: "07|01",
    previous: "+2250701",
    inputType: "deleteContentForward",
    value: "+225071",
    shown: "07| 1",
  },
])("$edit", ({ left, previous, inputType, value, shown }) => {
  expect(afterEdit(left, previous, inputType)).toEqual({ value, shown });
});
