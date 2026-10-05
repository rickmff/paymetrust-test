import { z } from "zod";
import { LOCALE } from "./format";

export type SortDirection = "ascending" | "descending";

/** Which column a list is ordered by, and which way. */
export type Sort<Column extends string = string> = {
  column: Column;
  direction: SortDirection;
};

/**
 * A sort as one string, the way the URL and the API carry it: "amount" is
 * ascending, "-amount" is descending. One parameter, so a column and a
 * direction can never disagree.
 */
export const toSortParam = ({ column, direction }: Sort) =>
  direction === "descending" ? `-${column}` : column;

/**
 * Reads a sort back from the URL. Like a filter, it is user input: a column
 * this list can't be sorted by is dropped (`undefined`), not an error.
 */
export function sortSchema<const Column extends string>(
  columns: readonly Column[],
) {
  return z
    .string()
    .transform((param): Sort<Column> | undefined => {
      const descending = param.startsWith("-");
      const name = descending ? param.slice(1) : param;
      const column = columns.find((each) => each === name);
      return column === undefined
        ? undefined
        : { column, direction: descending ? "descending" : "ascending" };
    })
    .optional()
    .catch(undefined);
}

// `numeric`: "PO-999" comes before "PO-1000". `base`: "Kone" and "Koné" are
// the same name to someone looking for it.
const collator = new Intl.Collator(LOCALE, {
  numeric: true,
  sensitivity: "base",
});

/**
 * Orders a copy of the rows in the browser. Only right when the browser holds
 * the whole list: with pages, the server must sort, because it alone has
 * every row. Rows that tie keep the order they came in.
 */
export function sortRows<Row>(
  rows: readonly Row[],
  direction: SortDirection,
  value: (row: Row) => string | number,
): Row[] {
  const sign = direction === "descending" ? -1 : 1;
  return rows.toSorted((a, b) => sign * compare(value(a), value(b)));
}

function compare(a: string | number, b: string | number): number {
  return typeof a === "number" && typeof b === "number"
    ? a - b
    : collator.compare(String(a), String(b));
}
