import { Alert, Button } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { DataTable, type Column } from "@/components/DataTable";
import { EmptyMessage } from "@/components/EmptyMessage";
import { ErrorState } from "@/components/ErrorState";
import { Money } from "@/components/Money";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { Can } from "@/features/auth/guards";
import { useCan, useSession } from "@/features/auth/session";
import { formatPhone } from "@/lib/format";
import { OPERATOR_LABEL } from "@/lib/operators";
import { sortRows, sortSchema, toSortParam, type Sort } from "@/lib/sort";
import { payoutQueries } from "./api";
import { DecisionDialog } from "./DecisionDialog";
import { PAYOUT_STATUS, type Payout } from "./schemas";

const columns: Column<Payout>[] = [
  { key: "id", header: "Payout", sortable: true },
  {
    key: "recipient_name",
    header: "Recipient",
    sortable: true,
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
  { key: "reference", header: "Reference", sortable: true },
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
    sortable: true,
    render: (payout) => payout.created_by.name,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
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

// The whole list arrives in one response, so the browser can sort it. What
// each column is ordered by is what its cell shows, not always the raw field:
// a status sorts by its label, not by its code.
const SortSchema = sortSchema([
  "id",
  "recipient_name",
  "reference",
  "amount",
  "created_by",
  "status",
]);
type PayoutSort = NonNullable<z.infer<typeof SortSchema>>;

const SORT_VALUE: Record<
  PayoutSort["column"],
  (payout: Payout) => string | number
> = {
  id: (payout) => payout.id,
  recipient_name: (payout) => payout.recipient_name,
  reference: (payout) => payout.reference,
  amount: (payout) => payout.amount,
  created_by: (payout) => payout.created_by.name,
  status: (payout) => PAYOUT_STATUS[payout.status].label,
};

/** Ids count up, so this is newest first: the order the server sends. */
const DEFAULT_SORT: PayoutSort = { column: "id", direction: "descending" };

type PendingDecision = { payout: Payout; decision: "approve" | "reject" };

// Set by the wizard after it creates a payout. Router state is `any`: parse it.
const CreatedState = z.object({ created: z.string() });

export function PayoutsPage() {
  const user = useSession();
  const can = useCan();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useQuery(payoutQueries.list());
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

  // The sort lives in the URL, like the filters of the transactions list.
  const sort =
    SortSchema.parse(searchParams.get("sort") ?? undefined) ?? DEFAULT_SORT;
  const rows = sortRows(
    query.data ?? [],
    sort.direction,
    SORT_VALUE[sort.column],
  );

  function setSort(next: Sort) {
    setSearchParams((params) => {
      params.set("sort", toSortParam(next));
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

      {query.isError && (
        <ErrorState
          title="Could not load payouts"
          error={query.error}
          onRetry={() => query.refetch()}
        />
      )}

      {(!query.isError || query.data) && (
        <DataTable
          label="Payouts"
          columns={columns}
          rows={rows}
          sort={sort}
          onSortChange={setSort}
          isLoading={query.isPending}
          empty={
            <EmptyMessage
              title="No payouts yet"
              description="Create one and it will wait here for approval."
            />
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
