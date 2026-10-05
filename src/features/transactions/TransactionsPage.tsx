import { Button, Link } from "@heroui/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { DataTable, type Column } from "@/components/DataTable";
import { EmptyMessage } from "@/components/EmptyMessage";
import { ErrorState } from "@/components/ErrorState";
import { Money } from "@/components/Money";
import { PageHeader } from "@/components/PageHeader";
import { SelectField } from "@/components/SelectField";
import { StatusChip } from "@/components/StatusChip";
import { formatDateTime, formatPhone } from "@/lib/format";
import { OPERATOR_LABEL, OPERATOR_OPTIONS } from "@/lib/operators";
import { toSortParam } from "@/lib/sort";
import { transactionQueries } from "./api";
import {
  DEFAULT_TRANSACTION_SORT,
  TRANSACTION_STATUS,
  TRANSACTION_STATUS_OPTIONS,
  TransactionFiltersSchema,
  TransactionSortSchema,
  type Transaction,
  type TransactionFilters,
} from "./schemas";

const columns: Column<Transaction>[] = [
  {
    key: "id",
    header: "Transaction",
    render: (t) => <Link href={`/transactions/${t.id}`}>{t.id}</Link>,
  },
  {
    key: "created_at",
    header: "Date",
    sortable: true,
    render: (t) => formatDateTime(t.created_at),
  },
  {
    key: "customer_phone",
    header: "Customer",
    render: (t) => formatPhone(t.customer_phone),
  },
  {
    key: "operator",
    header: "Operator",
    render: (t) => OPERATOR_LABEL[t.operator],
  },
  {
    key: "amount",
    header: "Amount",
    align: "end",
    sortable: true,
    render: (t) => <Money amount={t.amount} currency={t.currency} />,
  },
  {
    key: "status",
    header: "Status",
    render: (t) => <StatusChip {...TRANSACTION_STATUS[t.status]} />,
  },
];

export function TransactionsPage() {
  // The URL is the state: filters and sort survive a refresh, the back button and a shared link.
  const [searchParams, setSearchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams);
  const filters = TransactionFiltersSchema.parse(params);
  const sort =
    TransactionSortSchema.parse(params.sort) ?? DEFAULT_TRANSACTION_SORT;
  const hasFilters = Object.values(filters).some(Boolean);

  const query = useInfiniteQuery(transactionQueries.list(filters, sort));
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];

  function setParam(
    name: keyof TransactionFilters | "sort",
    value: string | null,
  ) {
    setSearchParams((params) => {
      if (value) params.set(name, value);
      else params.delete(name);
      return params;
    });
  }

  function clearFilters() {
    // Only the filters go. The sort stays: it is not what hid the rows.
    setSearchParams((params) => {
      for (const name of TransactionFiltersSchema.keyof().options) {
        params.delete(name);
      }
      return params;
    });
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Payments collected from your customers."
      />

      <div className="flex flex-wrap gap-4">
        <SelectField
          className="w-52"
          label="Status"
          emptyLabel="All statuses"
          options={TRANSACTION_STATUS_OPTIONS}
          value={filters.status ?? null}
          onChange={(status) => setParam("status", status)}
        />
        <SelectField
          className="w-52"
          label="Operator"
          emptyLabel="All operators"
          options={OPERATOR_OPTIONS}
          value={filters.operator ?? null}
          onChange={(operator) => setParam("operator", operator)}
        />
      </div>

      {query.isError && (
        <ErrorState
          title="Could not load transactions"
          error={query.error}
          onRetry={() =>
            query.isFetchNextPageError ? query.fetchNextPage() : query.refetch()
          }
        />
      )}

      {/* After a failed refresh the last good rows stay on screen, under the error. */}
      {(!query.isError || query.data) && (
        <DataTable
          label="Transactions"
          columns={columns}
          rows={rows}
          sort={sort}
          onSortChange={(next) => setParam("sort", toSortParam(next))}
          isLoading={query.isPending}
          isStale={query.isPlaceholderData}
          empty={
            hasFilters ? (
              <EmptyMessage title="No transactions match these filters">
                <Button size="sm" variant="secondary" onPress={clearFilters}>
                  Clear filters
                </Button>
              </EmptyMessage>
            ) : (
              <EmptyMessage
                title="No transactions yet"
                description="They will show up here as your customers pay."
              />
            )
          }
          footer={
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted">
                Showing {rows.length} transactions
              </span>
              {query.hasNextPage && (
                <Button
                  size="sm"
                  variant="secondary"
                  isPending={query.isFetchingNextPage}
                  onPress={() => query.fetchNextPage()}
                >
                  Load more
                </Button>
              )}
            </div>
          }
        />
      )}
    </>
  );
}
