import { cn, Skeleton, Table } from "@heroui/react";
import type { ReactNode } from "react";
import type { Sort } from "@/lib/sort";

export type Column<Row> = {
  /** Must be a real key of the row, so a typo fails at compile time. */
  key: keyof Row & string;
  header: string;
  align?: "start" | "end";
  /** Defaults to the raw value as text. */
  render?: (row: Row) => ReactNode;
  /** Makes the header a button that asks to sort by this column. */
  sortable?: boolean;
};

type DataTableProps<Row extends { id: string }> = {
  /** Accessible name of the table. */
  label: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  /** What to show when there are no rows. The page decides the wording. */
  empty: ReactNode;
  /** Adds a trailing "Actions" column. */
  actions?: (row: Row) => ReactNode;
  footer?: ReactNode;
  /**
   * The order the rows are already in. The table shows it and reports a click
   * on a header; it never reorders rows. The page sorts, or asks the server to.
   */
  sort?: Sort<keyof Row & string>;
  onSortChange?: (sort: Sort<keyof Row & string>) => void;
  /** First load: no rows yet. */
  isLoading?: boolean;
  /** Showing the previous result while the next one loads. */
  isStale?: boolean;
};

/**
 * The app's standard table: HeroUI's accessible Table (React Aria) plus our
 * loading and empty states. Generic over the row, so columns are type-checked
 * against the data they show.
 */
export function DataTable<Row extends { id: string }>({
  label,
  columns,
  rows,
  empty,
  actions,
  footer,
  sort,
  onSortChange,
  isLoading = false,
  isStale = false,
}: DataTableProps<Row>) {
  return (
    <Table
      aria-busy={isLoading || isStale}
      className={cn("transition-opacity", isStale && "opacity-60")}
    >
      <Table.ScrollContainer>
        {/* A minimum width: on a phone the table scrolls sideways instead of squeezing its cells. */}
        <Table.Content
          aria-label={label}
          className="min-w-[640px]"
          sortDescriptor={sort}
          onSortChange={({ column, direction }) => {
            // React Aria hands back a loose `Key`. Looking it up in the
            // columns gets the typed key back with no cast.
            const key = columns.find((each) => each.key === column)?.key;
            if (key) onSortChange?.({ column: key, direction });
          }}
        >
          <Table.Header>
            {columns.map((column, index) => (
              <Table.Column
                key={column.key}
                id={column.key}
                isRowHeader={index === 0}
                allowsSorting={column.sortable}
                className={cn(column.align === "end" && "text-end")}
              >
                {column.sortable
                  ? ({ sortDirection }) => (
                      <Table.SortableColumnHeader
                        sortDirection={sortDirection}
                        // The arrow stays beside the label of a right-aligned
                        // column, not at the far side of the cell.
                        className={cn(
                          column.align === "end" && "justify-end gap-1",
                        )}
                      >
                        {column.header}
                      </Table.SortableColumnHeader>
                    )
                  : column.header}
              </Table.Column>
            ))}
            {actions && (
              <Table.Column id="actions" className="text-end">
                Actions
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (isLoading ? <LoadingRows /> : empty)}
          >
            {rows.map((row) => (
              <Table.Row key={row.id} id={row.id}>
                {columns.map((column, index) => (
                  <Table.Cell
                    key={column.key}
                    className={cn(
                      column.align === "end" && "text-end",
                      index === 0 && "whitespace-nowrap",
                    )}
                  >
                    {column.render
                      ? column.render(row)
                      : String(row[column.key])}
                  </Table.Cell>
                ))}
                {actions && (
                  <Table.Cell className="text-end">{actions(row)}</Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      {footer && <Table.Footer>{footer}</Table.Footer>}
    </Table>
  );
}

function LoadingRows() {
  return (
    // A plain <div> can't carry a name: without the role, screen readers skip
    // the label. "status" is also what HeroUI's Spinner uses.
    <div className="flex flex-col gap-3 p-4" role="status" aria-label="Loading">
      {[0, 1, 2, 3, 4].map((row) => (
        <Skeleton key={row} className="h-5 w-full rounded-lg" />
      ))}
    </div>
  );
}
