import { Alert, Button } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { DataTable, type Column } from "@/components/DataTable";
import { EmptyMessage } from "@/components/EmptyMessage";
import { ErrorState } from "@/components/ErrorState";
import { Money } from "@/components/Money";
import { PageHeader } from "@/components/PageHeader";
import { SelectField } from "@/components/SelectField";
import { StatusChip } from "@/components/StatusChip";
import { Can } from "@/features/auth/guards";
import { useCan, useSession } from "@/features/auth/session";
import { formatPhone } from "@/lib/format";
import { OPERATOR_LABEL } from "@/lib/operators";
import { toSortParam } from "@/lib/sort";
import { payoutQueries } from "./api";
import { DecisionDialog } from "./DecisionDialog";
import {
  DEFAULT_PAYOUT_SORT,
  PAYOUT_STATUS,
  PAYOUT_STATUS_OPTIONS,
  PayoutFiltersSchema,
  PayoutSortSchema,
  type Payout,
  type PayoutFilters,
} from "./schemas";

const columns: Column<Payout>[] = [
  { key: "id", header: "Payout", sortable: true },
  {
    key: "recipient_name",
    header: "Recipient",
    render: (payout) => (
      <div className="flex flex-col">
        <span>{payout.recipient_name}</span>
        <span className="text-xs text-muted">
          {OPERATOR_LABEL[payout.operator]}{" "}
          {formatPhone(payout.recipient_phone)}
        </span>
      </div>
    ),
  },
  { key: "reference", header: "Reference" },
  {
    key: "amount",
    header: "Amount",
    align: "end",
    sortable: true,
    render: (payout) => (
      <Money amount={payout.amount} currency={payout.currency} />
    ),
  },
  {
    key: "created_by",
    header: "Created by",
    render: (payout) => payout.created_by.name,
  },
  {
    key: "status",
    header: "Status",
    render: (payout) => (
      <div className="flex flex-col items-start gap-1">
        <StatusChip {...PAYOUT_STATUS[payout.status]} />
        {/* Narrowing: decided_by only exists once the payout is decided. */}
        {payout.status !== "pending_approval" && (
          <span className="text-xs text-muted">
            by {payout.decided_by.name}
            {payout.status === "rejected" && `: ${payout.decision_reason}`}
          </span>
        )}
      </div>
    ),
  },
];

type PendingDecision = { payout: Payout; decision: "approve" | "reject" };

// Set by the wizard after it creates a payout. Router state is `any`: parse it.
const CreatedState = z.object({ created: z.string() });

export function PayoutsPage() {
  const user = useSession();
  const can = useCan();
  const location = useLocation();
  const navigate = useNavigate();
  // The filter and the sort live in the URL, like those of the transactions list.
  const [searchParams, setSearchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams);
  const filters = PayoutFiltersSchema.parse(params);
  const sort = PayoutSortSchema.parse(params.sort) ?? DEFAULT_PAYOUT_SORT;

  const query = useInfiniteQuery(payoutQueries.list(filters, sort));
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const [pending, setPending] = useState<PendingDecision | null>(null);

  // The "sent for approval" notice is for this visit of the page. It is read
  // once into state, and then taken out of the history entry: left there, it
  // would come back with every reload and every press of Back.
  const [created] = useState(
    () => CreatedState.safeParse(location.state).data?.created,
  );
  useEffect(() => {
    if (CreatedState.safeParse(location.state).success) {
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      });
    }
  }, [location, navigate]);

  function setParam(name: keyof PayoutFilters | "sort", value: string | null) {
    setSearchParams((params) => {
      if (value) params.set(name, value);
      else params.delete(name);
      return params;
    });
  }

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Money sent out. Every payout needs a second person to approve it."
      >
        <Can permission="payout:create">
          <Link to="/payouts/new" className={buttonVariants({ size: "sm" })}>
            New payout
          </Link>
        </Can>
      </PageHeader>

      {created && (
        <Alert status="success" role="status">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Payout {created} was sent for approval</Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      {/* With pages, a payout that waits can sit far below the first one.
          This filter is how an approver sees every one of them. */}
      <SelectField
        className="w-52"
        label="Status"
        emptyLabel="All statuses"
        options={PAYOUT_STATUS_OPTIONS}
        value={filters.status ?? null}
        onChange={(status) => setParam("status", status)}
      />

      {query.isError && (
        <ErrorState
          title="Could not load payouts"
          error={query.error}
          onRetry={() =>
            query.isFetchNextPageError ? query.fetchNextPage() : query.refetch()
          }
        />
      )}

      {(!query.isError || query.data) && (
        <DataTable
          label="Payouts"
          columns={columns}
          rows={rows}
          sort={sort}
          onSortChange={(next) => setParam("sort", toSortParam(next))}
          isLoading={query.isPending}
          isStale={query.isPlaceholderData}
          empty={
            filters.status ? (
              <EmptyMessage title="No payouts with this status">
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => setParam("status", null)}
                >
                  Clear filter
                </Button>
              </EmptyMessage>
            ) : (
              <EmptyMessage
                title="No payouts yet"
                description="Create one and it will wait here for approval."
              />
            )
          }
          footer={
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted">
                Showing {rows.length} payouts
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
          // Never allowed to approve: no column at all (hidden, not disabled).
          actions={
            can("payout:approve")
              ? (payout) => (
                  <DecisionButtons
                    payout={payout}
                    isOwn={payout.created_by.id === user.id}
                    onDecide={(decision) => setPending({ payout, decision })}
                  />
                )
              : undefined
          }
        />
      )}

      {/* Mounted only while open, so each decision starts with a clean form. */}
      {pending && (
        <DecisionDialog {...pending} onClose={() => setPending(null)} />
      )}
    </>
  );
}

type DecisionButtonsProps = {
  payout: Payout;
  isOwn: boolean;
  onDecide: (decision: PendingDecision["decision"]) => void;
};

function DecisionButtons({ payout, isOwn, onDecide }: DecisionButtonsProps) {
  if (payout.status !== "pending_approval") return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {/* The label names the row, so "Approve" isn't ambiguous to a screen reader. */}
        <Button
          size="sm"
          aria-label={`Approve ${payout.id}`}
          isDisabled={isOwn}
          onPress={() => onDecide("approve")}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label={`Reject ${payout.id}`}
          isDisabled={isOwn}
          onPress={() => onDecide("reject")}
        >
          Reject
        </Button>
      </div>
      {/* Allowed in general but blocked here: disabled, with the reason in plain
          text. A tooltip wouldn't do: disabled buttons get no hover or focus. */}
      {isOwn && (
        <span className="text-xs text-muted">
          You created this payout. Another approver must decide.
        </span>
      )}
    </div>
  );
}
