import {
  Description,
  FieldError,
  Input,
  InputGroup,
  Label,
  TextField,
} from "@heroui/react";
import {
  useCallback,
  useState,
  type ChangeEvent,
  type ComponentProps,
} from "react";
import {
  useController,
  type Control,
  type FieldPathByValue,
  type FieldValues,
} from "react-hook-form";
import { applyMask, type Mask } from "./mask";
import { Numpad, type NumpadProps } from "./numpad/Numpad";

type FormTextFieldProps<Values extends FieldValues, Output> = {
  control: Control<Values, unknown, Output>;
  /** Only the form's string fields are accepted; a typo or a number field won't compile. */
  name: FieldPathByValue<Values, string>;
  label: string;
  description?: string;
  placeholder?: string;
  /** Text that is always in front of the value, like a country code: shown, never typed. */
  prefix?: string;
  /** Shows the value in another format than the one the form holds. */
  mask?: Mask;
  /**
   * For fields of digits: clicking the field also offers an on-screen keypad.
   * `true`, or where it should go when "under the field" would cover too much.
   */
  numpad?: boolean | Pick<NumpadProps, "side" | "align">;
} & Pick<
  ComponentProps<typeof TextField>,
  "type" | "inputMode" | "autoComplete"
>;

/**
 * The bridge between React Hook Form and HeroUI, written once.
 * RHF owns the value and the errors; HeroUI (React Aria) owns the markup and
 * wires label, description and error to the input for screen readers.
 */
export function FormTextField<Values extends FieldValues, Output>({
  control,
  name,
  label,
  description,
  placeholder,
  prefix,
  mask,
  numpad = false,
  ...fieldProps
}: FormTextFieldProps<Values, Output>) {
  const {
    field: { ref, value: fieldValue, onChange, onBlur },
    fieldState: { invalid, error },
  } = useController({ control, name });
  // Safe: `name` only accepts paths whose value is a string. TypeScript
  // can't follow that through the generic, so we state it here once.
  const value = fieldValue as string;

  // The keypad attaches to the <input> element itself, so it is kept in state.
  // RHF's own ref still gets the element: one ref callback feeds both.
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const inputRef = useCallback(
    (element: HTMLInputElement | null) => {
      ref(element);
      setInput(element);
    },
    [ref],
  );

  const inputProps = {
    // The ref lets RHF focus the first invalid field after a failed submit.
    ref: numpad ? inputRef : ref,
    placeholder,
    // A mask needs more than the new text: where the caret is and what kind
    // of edit it was. So it listens on the input, not on the field.
    onChange:
      mask &&
      ((event: ChangeEvent<HTMLInputElement>) =>
        onChange(
          applyMask(mask, event.currentTarget, value, event.nativeEvent),
        )),
  };

  return (
    <TextField
      {...fieldProps}
      fullWidth
      name={name}
      value={mask ? mask.format(value) : value}
      onChange={mask ? undefined : onChange}
      onBlur={onBlur}
      isInvalid={invalid}
      // Zod decides what is valid. "aria" stops the browser's own validation
      // bubbles from getting in the way.
      validationBehavior="aria"
    >
      <Label>{label}</Label>
      {prefix ? (
        <InputGroup fullWidth isInvalid={invalid}>
          <InputGroup.Prefix>{prefix}</InputGroup.Prefix>
          <InputGroup.Input {...inputProps} />
        </InputGroup>
      ) : (
        <Input {...inputProps} />
      )}
      {numpad && (
        <Numpad
          anchor={input}
          // Confirming on the keypad says the field is done, as leaving it
          // does: the form may validate it now.
          onConfirm={onBlur}
          {...(numpad === true ? undefined : numpad)}
        />
      )}
      {description && <Description>{description}</Description>}
      <FieldError>{error?.message}</FieldError>
    </TextField>
  );
}
