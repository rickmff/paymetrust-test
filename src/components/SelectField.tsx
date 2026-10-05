import { FieldError, Label, ListBox, Select } from "@heroui/react";
import type { Ref } from "react";

export type Option<Value extends string> = { value: Value; label: string };

type SelectFieldProps<Value extends string> = {
  label: string;
  options: readonly Option<Value>[];
  /** `null` means nothing selected. */
  value: Value | null;
  onChange: (value: Value | null) => void;
  /** When set, adds a first option that clears the selection ("All statuses"). */
  emptyLabel?: string;
  placeholder?: string;
  errorMessage?: string;
  onBlur?: () => void;
  /** The focusable button. A form library uses it to focus the field on error. */
  triggerRef?: Ref<HTMLButtonElement>;
  className?: string;
};

const EMPTY = "__empty__";

/**
 * HeroUI's Select with a typed value. `Value` ties the options to `onChange`:
 * give it status options and it hands back a status, not a loose string.
 */
export function SelectField<Value extends string>({
  label,
  options,
  value,
  onChange,
  emptyLabel,
  placeholder,
  errorMessage,
  onBlur,
  triggerRef,
  className,
}: SelectFieldProps<Value>) {
  return (
    <Select
      className={className}
      placeholder={placeholder}
      value={value ?? (emptyLabel ? EMPTY : null)}
      // React Aria hands back a loose `Key`. Looking it up in the options gets
      // the typed value back with no cast; the "empty" key simply isn't found.
      onChange={(key) =>
        onChange(options.find((option) => option.value === key)?.value ?? null)
      }
      onBlur={onBlur}
      isInvalid={errorMessage !== undefined}
    >
      <Label>{label}</Label>
      <Select.Trigger ref={triggerRef}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {emptyLabel && (
            <ListBox.Item id={EMPTY} textValue={emptyLabel}>
              {emptyLabel}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      <FieldError>{errorMessage}</FieldError>
    </Select>
  );
}
