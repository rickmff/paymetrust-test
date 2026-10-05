import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form } from "@heroui/react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import type { z } from "zod";
import { FormTextField } from "@/components/FormTextField";
import { SelectField } from "@/components/SelectField";
import { OPERATOR_OPTIONS } from "@/lib/operators";
import { COUNTRY_CODE, phoneMask } from "@/lib/phone";
import { RecipientStepSchema } from "../schemas";
import { stepPath, usePayoutWizard } from "./wizard";

export function RecipientStep() {
  const { draft, saveStep, serverErrors } = usePayoutWizard();
  const navigate = useNavigate();

  // Input = what the fields hold while typing; output = what Zod hands to
  // onSubmit. Spelled out here because one default below is `undefined`.
  const form = useForm<
    z.input<typeof RecipientStepSchema>,
    unknown,
    z.output<typeof RecipientStepSchema>
  >({
    resolver: zodResolver(RecipientStepSchema),
    // Validate when the user leaves a field, not on every keystroke.
    mode: "onTouched",
    defaultValues: {
      operator: draft.operator,
      recipient_name: draft.recipient_name ?? "",
      recipient_phone: draft.recipient_phone ?? "",
    },
    // A 422 from the final submit lands here, on the field the server named.
    errors: serverErrors,
  });

  return (
    <Form
      className="flex flex-col gap-4"
      validationBehavior="aria"
      onSubmit={form.handleSubmit((values) => {
        saveStep(values);
        navigate(stepPath("amount"));
      })}
    >
      {/* Controller: the bridge for a controlled component that isn't a text input. */}
      <Controller
        control={form.control}
        name="operator"
        render={({ field: { ref, value, onChange, onBlur }, fieldState }) => (
          <SelectField
            label="Operator"
            placeholder="Choose an operator"
            options={OPERATOR_OPTIONS}
            value={value ?? null}
            onChange={onChange}
            onBlur={onBlur}
            triggerRef={ref}
            errorMessage={fieldState.error?.message}
          />
        )}
      />
      <FormTextField
        control={form.control}
        name="recipient_name"
        label="Recipient name"
        autoComplete="off"
        placeholder="e.g. Awa Koné"
      />
      <FormTextField
        control={form.control}
        name="recipient_phone"
        label="Mobile money number"
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        // The country is always the same, so it is shown and not typed. What
        // is typed are the ten digits, in pairs, the way a number is read out.
        prefix={COUNTRY_CODE}
        mask={phoneMask}
        // Beside the field, as for the amount: under it, the keypad would
        // cover the help text and the error it is there to help fix.
        numpad={{ side: "right" }}
        placeholder="07 00 00 00 00"
        description="Côte d'Ivoire numbers only."
      />
      <div className="flex justify-end">
        <Button type="submit">Continue</Button>
      </div>
    </Form>
  );
}
