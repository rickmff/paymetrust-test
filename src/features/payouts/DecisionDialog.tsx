import { zodResolver } from "@hookform/resolvers/zod";
import { AlertDialog, Button, Form } from "@heroui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorState } from "@/components/ErrorState";
import { FormTextField } from "@/components/FormTextField";
import { Money } from "@/components/Money";
import { isApiError } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { OPERATOR_LABEL } from "@/lib/operators";
import { useDecidePayout } from "./api";
import { RejectionSchema, type Payout } from "./schemas";

type DecisionDialogProps = {
  payout: Payout;
  decision: "approve" | "reject";
  onClose: () => void;
};

const COPY = {
  approve: { heading: "Approve this payout?", confirm: "Approve payout" },
  reject: { heading: "Reject this payout?", confirm: "Reject payout" },
} as const;

const NoReasonSchema = z.object({ reason: z.string() });

/**
 * The confirmation step for a decision about money. It can only be left
 * through its buttons: no Escape, no click outside (AlertDialog's default).
 */
export function DecisionDialog({
  payout,
  decision,
  onClose,
}: DecisionDialogProps) {
  const decide = useDecidePayout();
  const form = useForm({
    // A rejection needs a reason; an approval doesn't.
    resolver: zodResolver(
      decision === "reject" ? RejectionSchema : NoReasonSchema,
    ),
    defaultValues: { reason: "" },
  });

  const submit = form.handleSubmit(({ reason }) =>
    decide.mutate(
      decision === "reject"
        ? { id: payout.id, decision, reason }
        : { id: payout.id, decision },
      { onSuccess: onClose },
    ),
  );

  // Some answers are final: already decided by someone else (409), not
  // allowed (403), gone (404). Asking again gets the same answer, so the
  // dialog stops offering it. A reason the server rejected (422) can be
  // rewritten, and a failure on the way (network, 5xx) can pass next time.
  const isFinal =
    isApiError(decide.error) &&
    decide.error.status < 500 &&
    decide.error.status !== 422;

  return (
    <AlertDialog.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-md">
          <Form validationBehavior="aria" onSubmit={submit}>
            <AlertDialog.Header>
              <AlertDialog.Icon
                status={decision === "approve" ? "accent" : "danger"}
              />
              <AlertDialog.Heading>
                {COPY[decision].heading}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex flex-col gap-4">
              <p>
                <Money
                  className="font-semibold"
                  amount={payout.total}
                  currency={payout.currency}
                />{" "}
                (fee included) to {payout.recipient_name},{" "}
                {OPERATOR_LABEL[payout.operator]}{" "}
                {formatPhone(payout.recipient_phone)}.
              </p>
              {decision === "reject" && (
                <FormTextField
                  control={form.control}
                  name="reason"
                  label="Reason"
                  placeholder="e.g. Duplicate of an earlier payout"
                  description="The person who created the payout will see this."
                />
              )}
              {decide.isError && (
                <ErrorState
                  title="The payout was not updated"
                  error={decide.error}
                />
              )}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                variant="tertiary"
                isDisabled={decide.isPending}
                onPress={onClose}
              >
                {isFinal ? "Close" : "Cancel"}
              </Button>
              {/* isPending disables the button: a double click sends one request. */}
              <Button
                type="submit"
                variant={decision === "approve" ? "primary" : "danger"}
                isPending={decide.isPending}
                isDisabled={isFinal}
              >
                {COPY[decision].confirm}
              </Button>
            </AlertDialog.Footer>
          </Form>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
