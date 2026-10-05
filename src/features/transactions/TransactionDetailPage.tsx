import { Card, Link, Skeleton } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useParams } from "react-router";
import { ErrorState } from "@/components/ErrorState";
import { Money } from "@/components/Money";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { assertNever } from "@/lib/assert-never";
import { formatDateTime, formatPhone, formatTime } from "@/lib/format";
import { OPERATOR_LABEL } from "@/lib/operators";
import { transactionQueries } from "./api";
import { TRANSACTION_STATUS, type Transaction } from "./schemas";

/**
 * Narrowing on the discriminant: inside each case TypeScript knows which
 * fields exist. If a fifth status is added, `assertNever` stops compiling
 * until this function handles it.
 */
function describe(transaction: Transaction): string {
  switch (transaction.status) {
    case "pending":
      return "Waiting for the customer to confirm on their phone.";
    case "success":
      return `Paid on ${formatDateTime(transaction.settled_at)}.`;
    case "failed":
      return `Failed: ${transaction.failure_reason}.`;
    case "reversed":
      return `Paid on ${formatDateTime(transaction.settled_at)}, then reversed on ${formatDateTime(transaction.reversed_at)}.`;
    default:
      return assertNever(transaction);
  }
}

export function TransactionDetailPage() {
  const { id = "" } = useParams();
  const query = useQuery(transactionQueries.detail(id));

  if (query.isPending) {
    return (
      <Skeleton
        role="status"
        aria-label="Loading"
        className="h-64 w-full rounded-xl"
      />
    );
  }

  if (query.isError) {
    return (
      <>
        <ErrorState
          title="Could not load this transaction"
          error={query.error}
          onRetry={() => query.refetch()}
        />
        <Link href="/transactions">Back to transactions</Link>
      </>
    );
  }

  const transaction = query.data;

  return (
    <>
      <Link href="/transactions">Back to transactions</Link>
      <PageHeader title={transaction.id}>
        <StatusChip {...TRANSACTION_STATUS[transaction.status]} />
      </PageHeader>

      {/* role="status": when polling flips pending to paid, screen readers hear it. */}
      <p role="status">{describe(transaction)}</p>
      {transaction.status === "pending" && (
        <p className="text-sm text-muted">
          Checking with the operator. Last checked at{" "}
          {formatTime(query.dataUpdatedAt)}.
        </p>
      )}

      <Card>
        <Card.Content>
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3">
            <Row label="Amount">
              <Money
                amount={transaction.amount}
                currency={transaction.currency}
              />
            </Row>
            <Row label="Fee">
              <Money amount={transaction.fee} currency={transaction.currency} />
            </Row>
            <Row label="Net">
              <Money
                className="font-semibold"
                amount={transaction.net}
                currency={transaction.currency}
              />
            </Row>
            <Row label="Operator">{OPERATOR_LABEL[transaction.operator]}</Row>
            <Row label="Customer">
              {formatPhone(transaction.customer_phone)}
            </Row>
            <Row label="Created">{formatDateTime(transaction.created_at)}</Row>
          </dl>
        </Card.Content>
      </Card>
    </>
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
