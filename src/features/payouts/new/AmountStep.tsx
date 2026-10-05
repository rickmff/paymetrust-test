import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router";
import { FormTextField } from "@/components/FormTextField";
import { AmountStepSchema } from "../schemas";
import { firstIncompleteStep, stepPath, usePayoutWizard } from "./wizard";

export function AmountStep() {
  const { draft, saveStep, serverErrors } = usePayoutWizard();
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(AmountStepSchema),
    mode: "onTouched",
    defaultValues: {
      // The form holds text (z.input); the draft holds the parsed number (z.output).
      amount: draft.amount === undefined ? "" : String(draft.amount),
      reference: draft.reference ?? "",
    },
    errors: serverErrors,
  });

  // Route guard: this URL was opened before the previous step was finished.
  if (firstIncompleteStep(draft) === "recipient") {
    return <Navigate to={stepPath("recipient")} replace />;
  }

  return (
    <Form
      className="flex flex-col gap-4"
      validationBehavior="aria"
      onSubmit={form.handleSubmit((values) => {
        saveStep(values);
        navigate(stepPath("review"));
      })}
    >
      <FormTextField
        control={form.control}
        name="amount"
        label="Amount (F CFA)"
        inputMode="numeric"
        // Beside the field: under it, the keypad would cover the limits
        // below, the next field and the Back button. In a narrow window it
        // goes under the field anyway.
        numpad={{ side: "right" }}
        autoComplete="off"
        // Plain digits, the simplest thing to type. "25 000" is accepted too.
        placeholder="e.g. 25000"
        description="Between 500 and 2 000 000 F CFA."
      />
      <FormTextField
        control={form.control}
        name="reference"
        label="Reference (optional)"
        autoComplete="off"
        placeholder="e.g. Invoice 0098"
        description="Shown to whoever approves the payout."
      />
      <div className="flex justify-between">
        <Link
          to={stepPath("recipient")}
          className={buttonVariants({ variant: "tertiary" })}
        >
          Back
        </Link>
        <Button type="submit">Continue</Button>
      </div>
    </Form>
  );
}
