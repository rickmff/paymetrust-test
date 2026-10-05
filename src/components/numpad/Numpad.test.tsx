import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  Numpad,
  NumpadBackspace,
  NumpadConfirm,
  NumpadKey,
  type NumpadProps,
} from "./Numpad";

// The rules of the keypad: what opens it, what closes it, what the keys do.
// jsdom has no layout, so where the keypad appears is tested in a real
// browser: visual-tests/numpad.interaction.spec.ts.

type FieldProps = {
  numpad?: Omit<NumpadProps, "anchor">;
  input?: ComponentProps<"input">;
  initialValue?: string;
  onChange?: (value: string) => void;
};

/** A controlled input with a keypad, and something else to click or tab to. */
function Field({ numpad, input, initialValue = "", onChange }: FieldProps) {
  const [element, setElement] = useState<HTMLInputElement | null>(null);
  const [value, setValue] = useState(initialValue);

  return (
    <>
      <label htmlFor="amount">Amount</label>
      <input
        id="amount"
        ref={setElement}
        inputMode="numeric"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onChange?.(event.target.value);
        }}
        {...input}
      />
      <Numpad anchor={element} {...numpad} />
      <button type="button">Elsewhere</button>
    </>
  );
}

const amount = () => screen.getByLabelText<HTMLInputElement>("Amount");
const keypad = () => screen.queryByRole("group", { name: "Numeric keypad" });
const key = (name: string) => screen.getByRole("button", { name });

/** Renders the field and opens its keypad the way a mouse user does. */
async function openKeypad(props: FieldProps = {}) {
  const user = userEvent.setup();
  render(<Field {...props} />);
  await user.click(amount());
  return user;
}

/** Renders the field with its keypad open from the start (`defaultOpen`). */
async function renderOpen(props: FieldProps = {}) {
  render(<Field {...props} numpad={{ defaultOpen: true, ...props.numpad }} />);
  // It is placed, and only then shown, a moment after the first render.
  await waitFor(() => expect(keypad()).toBeVisible());
}

/** Closing ends with the keypad out of the document. */
const expectClosed = () =>
  waitFor(() => expect(keypad()).not.toBeInTheDocument());

afterEach(() => {
  vi.useRealTimers();
});

// ---- opening -----------------------------------------------------------------

test("opens when the field is clicked with the mouse", async () => {
  await openKeypad();

  expect(keypad()).toBeVisible();
  expect(amount()).toHaveFocus();
});

test("opens from a click on the field's label", async () => {
  const user = userEvent.setup();
  render(<Field />);

  await user.click(screen.getByText("Amount"));

  expect(keypad()).toBeVisible();
});

test("stays closed when the field is reached with the keyboard", async () => {
  const user = userEvent.setup();
  render(<Field />);

  await user.tab();

  expect(amount()).toHaveFocus();
  expect(keypad()).not.toBeInTheDocument();
});

test("stays closed for a touch: the device brings its own number keyboard", async () => {
  const user = userEvent.setup();
  render(<Field />);

  await user.pointer({ keys: "[TouchA]", target: amount() });

  expect(amount()).toHaveFocus();
  expect(keypad()).not.toBeInTheDocument();
});

test("stays closed when the focus comes from code", () => {
  render(<Field />);

  act(() => amount().focus());

  expect(keypad()).not.toBeInTheDocument();
});

test.each([
  ["read-only", { readOnly: true }],
  ["disabled", { disabled: true }],
] as const)("stays closed on a %s field", async (_name, input) => {
  await openKeypad({ input });

  expect(keypad()).not.toBeInTheDocument();
});

// ---- typing ------------------------------------------------------------------

test("the keys type into the field, which keeps the focus", async () => {
  const onChange = vi.fn();
  const user = await openKeypad({ onChange });

  for (const digit of "5000") await user.click(key(digit));

  expect(amount()).toHaveValue("5000");
  expect(amount()).toHaveFocus();
  // One change per key, the same as typing.
  expect(onChange.mock.calls).toEqual([["5"], ["50"], ["500"], ["5000"]]);
});

test("keys and keyboard write to the same place: the caret", async () => {
  const user = await openKeypad();

  await user.keyboard("15{ArrowLeft}");
  await user.click(key("9"));
  await user.keyboard("0");

  expect(amount()).toHaveValue("1905");
});

test("backspace deletes one character per press", async () => {
  const user = await openKeypad({ initialValue: "5000" });

  await user.click(key("Backspace"));

  expect(amount()).toHaveValue("500");
});

test("a held backspace repeats, and stops when the button goes up", async () => {
  await renderOpen({ initialValue: "123456789" });
  vi.useFakeTimers();
  const backspace = key("Backspace");

  fireEvent.pointerDown(backspace, { pointerType: "mouse", button: 0 });
  expect(amount()).toHaveValue("12345678");

  // Nothing more during the delay, then one more for each interval.
  act(() => vi.advanceTimersByTime(399));
  expect(amount()).toHaveValue("12345678");
  act(() => vi.advanceTimersByTime(1 + 60 * 2));
  expect(amount()).toHaveValue("12345");
  expect(backspace).toHaveAttribute("data-pressed");

  fireEvent.pointerUp(window);
  act(() => vi.advanceTimersByTime(1000));
  expect(amount()).toHaveValue("12345");
  expect(backspace).not.toHaveAttribute("data-pressed");
});

test("a held backspace stops by itself when the field is empty", async () => {
  const onChange = vi.fn();
  await renderOpen({ initialValue: "12", onChange });
  vi.useFakeTimers();

  fireEvent.pointerDown(key("Backspace"), { pointerType: "mouse", button: 0 });
  act(() => vi.advanceTimersByTime(5000));

  expect(amount()).toHaveValue("");
  expect(onChange).toHaveBeenCalledTimes(2);
});

test("a digit does not repeat while it is held", async () => {
  await renderOpen();
  vi.useFakeTimers();

  fireEvent.pointerDown(key("5"), { pointerType: "mouse", button: 0 });
  act(() => vi.advanceTimersByTime(2000));

  expect(amount()).toHaveValue("5");
});

test("only the main mouse button presses a key", async () => {
  await renderOpen();

  fireEvent.pointerDown(key("5"), { pointerType: "mouse", button: 2 });

  expect(amount()).toHaveValue("");
});

test("a click that nothing pressed (a screen reader's) still types", async () => {
  await renderOpen();

  // No pointerdown before it, and `detail` is 0.
  fireEvent.click(key("5"));

  expect(amount()).toHaveValue("5");
});

test("a touch on a key types once, on the click", async () => {
  const user = userEvent.setup();
  await renderOpen();

  await user.pointer({ keys: "[TouchA]", target: key("5") });

  expect(amount()).toHaveValue("5");
});

test("typing on the keyboard presses the matching key on screen", async () => {
  const user = await openKeypad();

  await user.keyboard("{5>}");
  expect(key("5")).toHaveAttribute("data-pressed");
  expect(key("6")).not.toHaveAttribute("data-pressed");

  await user.keyboard("{/5}");
  expect(key("5")).not.toHaveAttribute("data-pressed");
});

test("the keys are not tab stops", async () => {
  await openKeypad();

  for (const button of screen.getAllByRole("button")) {
    if (button.textContent === "Elsewhere") continue;
    expect(button).toHaveAttribute("tabindex", "-1");
    // And never a submit button, inside a form.
    expect(button).toHaveAttribute("type", "button");
  }
});

// ---- closing -----------------------------------------------------------------

test("Escape closes it, keeps the focus, and is not passed on", async () => {
  const onKeyDown = vi.fn();
  const user = userEvent.setup();
  render(
    // Stands for a dialog that would close on Escape.
    <div onKeyDown={(event) => onKeyDown(event.key)}>
      <Field />
    </div>,
  );
  await user.click(amount());

  await user.keyboard("{Escape}");
  await expectClosed();
  expect(amount()).toHaveFocus();
  expect(onKeyDown).not.toHaveBeenCalled();

  // With no keypad to close, Escape is the dialog's again.
  await user.keyboard("{Escape}");
  expect(onKeyDown).toHaveBeenCalledWith("Escape");
});

test("the confirm key closes it, keeps what was typed and the focus, and says so", async () => {
  const onConfirm = vi.fn();
  const user = await openKeypad({ numpad: { onConfirm } });
  await user.click(key("5"));

  await user.click(key("Confirm"));

  await expectClosed();
  expect(onConfirm).toHaveBeenCalledOnce();
  expect(amount()).toHaveValue("5");
  expect(amount()).toHaveFocus();
});

test("a press anywhere else closes it", async () => {
  const user = await openKeypad();

  await user.click(screen.getByRole("button", { name: "Elsewhere" }));

  await expectClosed();
});

test("a finger going down elsewhere does not: it may be starting a scroll", async () => {
  await openKeypad();

  fireEvent.pointerDown(document.body, { pointerType: "touch" });

  expect(keypad()).toBeVisible();
});

test("a tap elsewhere closes it, through the focus it takes", async () => {
  const user = await openKeypad();

  await user.pointer({
    keys: "[TouchA]",
    target: screen.getByRole("button", { name: "Elsewhere" }),
  });

  await expectClosed();
});

test("a click on the label of an open keypad leaves it open", async () => {
  const user = await openKeypad();

  await user.click(screen.getByText("Amount"));

  expect(keypad()).toBeVisible();
  expect(amount()).toHaveFocus();
});

test("a press on the keypad itself, between the keys, does not", async () => {
  const user = await openKeypad();

  await user.click(screen.getByRole("group", { name: "Numeric keypad" }));

  expect(keypad()).toBeVisible();
  expect(amount()).toHaveFocus();
});

test("Tab moves on and closes it", async () => {
  const user = await openKeypad();

  await user.tab();

  expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  await expectClosed();
});

test("stays open when it is the window that loses focus", async () => {
  await openKeypad();

  // Another tab or app: the input gets a blur but is still the active element.
  fireEvent.blur(amount());

  expect(keypad()).toBeVisible();
});

test("closes when the field stops being editable", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<Field />);
  await user.click(amount());
  expect(keypad()).toBeVisible();

  // A form that disables its fields while it submits.
  rerender(<Field input={{ disabled: true }} />);

  await expectClosed();
});

test("clicking the field again after closing opens it again", async () => {
  const user = await openKeypad();
  await user.keyboard("{Escape}");
  await expectClosed();

  await user.click(amount());

  expect(keypad()).toBeVisible();
});

// ---- options -----------------------------------------------------------------

test("controlled: it asks through onOpenChange and stays as it is told", async () => {
  const onOpenChange = vi.fn();
  const user = userEvent.setup();
  render(<Field numpad={{ open: false, onOpenChange }} />);

  await user.click(amount());

  expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true);
  expect(keypad()).not.toBeInTheDocument();
});

test("controlled: the confirm key asks to close, and it is the owner who closes", async () => {
  const onOpenChange = vi.fn();
  const user = userEvent.setup();
  render(<Field numpad={{ open: true, onOpenChange }} />);
  await waitFor(() => expect(keypad()).toBeVisible());

  await user.click(key("Confirm"));

  expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  expect(keypad()).toBeVisible();
});

test("uncontrolled: onOpenChange reports each change once", async () => {
  const onOpenChange = vi.fn();
  const user = await openKeypad({ numpad: { onOpenChange } });

  await user.click(key("5"));
  await user.click(screen.getByRole("button", { name: "Elsewhere" }));

  expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
});

test("decimalSeparator adds its key to the empty corner", async () => {
  const user = await openKeypad({ numpad: { decimalSeparator: "," } });

  await user.click(key("1"));
  await user.click(key(","));
  await user.click(key("5"));

  expect(amount()).toHaveValue("1,5");
});

test("children replace the default keys", async () => {
  const user = await openKeypad({
    numpad: {
      children: (
        <>
          <NumpadKey value="5" />
          <NumpadKey value="000" />
          <NumpadBackspace aria-label="Delete" />
          <NumpadConfirm>OK</NumpadConfirm>
        </>
      ),
    },
  });

  await user.click(key("5"));
  await user.click(key("000"));
  expect(amount()).toHaveValue("5000");

  await user.click(key("Delete"));
  expect(amount()).toHaveValue("500");
  expect(screen.queryByRole("button", { name: "1" })).not.toBeInTheDocument();

  await user.click(key("OK"));
  await expectClosed();
});

test("a key outside a keypad says what is wrong", () => {
  // React logs the error it is about to throw; keep the test output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});

  expect(() => render(<NumpadKey value="1" />)).toThrow(
    "Numpad keys must be inside <Numpad>.",
  );

  vi.restoreAllMocks();
});
