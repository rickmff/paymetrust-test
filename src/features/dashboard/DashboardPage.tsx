import { Card, Link, Skeleton } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ErrorState } from "@/components/ErrorState";
import { Money } from "@/components/Money";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { Can } from "@/features/auth/guards";
import {
  TRANSACTION_STATUS,
  TransactionStatusSchema,
} from "@/features/transactions/schemas";
import { formatPercent } from "@/lib/format";
import { summaryQuery } from "./api";

export function DashboardPage() {
  const query = useQuery(summaryQuery);

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load the dashboard"
        error={query.error}
        onRetry={() => query.refetch()}
      />
    );
  }

  const summary = query.data;

  return (
    <>
      <PageHeader title="Dashboard" description="All transactions to date." />

      <section
        aria-label="Key figures"
        // Four across only when a total in the billions still fits its card.
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Stat label="Collected, net of fees">
          {summary && (
            <Money amount={summary.collected} currency={summary.currency} />
          )}
        </Stat>
        <Stat label="Success rate">
          {summary && formatPercent(summary.success_rate)}
        </Stat>
        <Stat label="Pending transactions">
          {summary?.transactions.pending}
        </Stat>
        <Can permission="payout:read">
          <Stat label="Payouts awaiting approval">
            {summary && (
              // The list comes in pages: without the filter, the link would
              // show the newest payouts, not the ones this number counts.
              <Link href="/payouts?status=pending_approval">
                {summary.payouts_pending_approval}
              </Link>
            )}
          </Stat>
        </Can>
      </section>

      <Card>
        <Card.Header>
          <h2 className="font-semibold">Transactions by status</h2>
        </Card.Header>
        <Card.Content>
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {TransactionStatusSchema.options.map((status) => (
              <li key={status} className="flex items-center gap-2">
                <StatusChip {...TRANSACTION_STATUS[status]} />
                {summary ? (
                  <span className="tabular-nums">
                    {summary.transactions[status]}
                  </span>
                ) : (
                  <Skeleton className="h-4 w-6 rounded" />
                )}
              </li>
            ))}
          </ul>
        </Card.Content>
      </Card>
    </>
  );
}

/** A skeleton with the final shape until the number arrives, so nothing jumps. */
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card>
      <Card.Content className="flex flex-col gap-1">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-2xl font-semibold">
          {children ?? <Skeleton className="h-8 w-28 rounded-lg" />}
        </span>
      </Card.Content>
    </Card>
  );
}
