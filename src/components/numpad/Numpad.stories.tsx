import { Description, Input, Label, TextField } from "@heroui/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Numpad, type NumpadProps } from "./Numpad";

/** What the story renders: a HeroUI field with a keypad attached to it. */
function Field(numpad: Omit<NumpadProps, "anchor">) {
  // The keypad needs the element, so the ref is a state setter.
  const [input, setInput] = useState<HTMLInputElement | null>(null);

  return (
    <TextField className="w-64">
      <Label>Amount (F CFA)</Label>
      <Input ref={setInput} inputMode="numeric" autoComplete="off" />
      <Numpad anchor={input} {...numpad} />
      <Description>Click the field, then use the keys or type.</Description>
    </TextField>
  );
}

const meta = {
  title: "Components/Numpad",
  component: Numpad,
  tags: ["autodocs"],
  // `anchor` is the input element: the story gets it from a ref, not an arg.
  args: { anchor: null },
  argTypes: {
    anchor: { control: false },
    children: { control: false },
    side: { control: "inline-radio" },
    align: { control: "inline-radio" },
    decimalSeparator: {
      control: "inline-radio",
      options: [undefined, ".", ","],
    },
  },
  parameters: {
    // On the docs page the story gets its own frame, with room for the
    // keypad: it renders in the top layer, above everything on the page.
    docs: { story: { inline: false, height: 360 } },
  },
  render: ({ anchor: _anchor, ...numpad }) => <Field {...numpad} />,
} satisfies Meta<typeof Numpad>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed until the field is clicked with the mouse. Tab into it: it stays closed. */
export const Default: Story = {};
