import { Button, Skeleton } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { ErrorState } from "@/components/ErrorState";
import { Money } from "@/components/Money";
import { isApiError } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { toMinorUnits } from "@/lib/money";
import { OPERATOR_LABEL } from "@/lib/operators";
import { payoutQueries, useCreatePayout } from "../api";
import {
  PAYOUT_CURRENCY,
  PayoutFormSchema,
  type PayoutFormValues,
} from "../schemas";
import {
  firstIncompleteStep,
  fromServer,
  stepPath,
  usePayoutWizard,
} from "./wizard";

export function ReviewStep() {
  const { draft } = usePayoutWizard();

  // The whole form is validated again before the user may submit it. The
  // schema reads what a form holds, so the amount goes back to text first.
  const form = PayoutFormSchema.safeParse({
    ...draft,
    amount: draft.amount?.toString(),
  });
  if (!form.success) {
    return (
      <Navigate to={stepPath(firstIncompleteStep(draft) ?? "amount")} replace />
    );
  }
  return <Review values={form.data} idempotencyKey={draft.idempotencyKey} />;
}

type ReviewProps = { values: PayoutFormValues; idempotencyKey: string };

function Review({ values, idempotencyKey }: ReviewProps) {
  const { discard, setServerErrors } = usePayoutWizard();
  const navigate = useNavigate();
  const create = useCreatePayout();

  // The one place a typed number becomes money.
  const amount = toMinorUnits(values.amount, PAYOUT_CURRENCY);
  const quote = useQuery(payoutQueries.quote(amount));

  function submit() {
    create.mutate(
      { ...values, amount, currency: PAYOUT_CURRENCY, idempotencyKey },
      {
        onSuccess: (payout) => {
          discard();
          navigate("/payouts", { state: { created: payout.id } });
        },
        onError: (error) => {
          if (!isApiError(error) || error.status !== 422) return;
          // The server rejected a field: go back to the step that owns it.
          const { errors, step } = fromServer(error.fieldErrors);
          if (step) {
            setServerErrors(errors);
            navigate(stepPath(step));
          }
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3">
        <Row label="Recipient">{values.recipient_name}</Row>
        <Row label="Operator">{OPERATOR_LABEL[values.operator]}</Row>
        <Row label="Number">{formatPhone(values.recipient_phone)}</Row>
        {values.reference && <Row label="Reference">{values.reference}</Row>}
        <Row label="Amount">
          <Money amount={amount} currency={PAYOUT_CURRENCY} />
        </Row>
        <Row label="Fee">
          {quote.data ? (
            <Money amount={quote.data.fee} currency={quote.data.currency} />
          ) : (
            <Skeleton className="h-5 w-20 rounded" />
          )}
        </Row>
        <Row label="Total to debit">
          {quote.data ? (
            <Money
              className="font-semibold"
              amount={quote.data.total}
              currency={quote.data.currency}
            />
          ) : (
            <Skeleton className="h-5 w-24 rounded" />
          )}
        </Row>
      </dl>

      {quote.isError && (
        <ErrorState
          title="Could not calculate the fee"
          error={quote.error}
          onRetry={() => quote.refetch()}
        />
      )}
      {create.isError && (
        <ErrorState title="The payout was not created" error={create.error} />
      )}

      <div className="flex justify-between">
        <Link
          to={stepPath("amount")}
          className={buttonVariants({ variant: "tertiary" })}
        >
          Back
        </Link>
        {/* Disabled until the fee is on screen: nobody confirms a total they can't see. */}
        <Button
          isDisabled={!quote.isSuccess}
          isPending={create.isPending}
          onPress={submit}
        >
          Create payout
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-sm text-muted">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
