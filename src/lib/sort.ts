import { z } from "zod";

export type SortDirection = "ascending" | "descending";

/** One column a list is ordered by, and which way. */
export type SortTerm<Column extends string = string> = {
  column: Column;
  direction: SortDirection;
};

/**
 * The order of a list. The first term decides; each next one only decides
 * between the rows the terms before it left equal.
 */
export type Sort<Column extends string = string> = readonly SortTerm<Column>[];

/**
 * A sort as one string, the way the URL and the API carry it: "amount" is
 * ascending, "-amount" is descending, and a comma adds the next term:
 * "-amount,id". One parameter, so a column and a direction can never disagree.
 */
export const toSortParam = (sort: Sort) =>
  sort
    .map(({ column, direction }) =>
      direction === "descending" ? `-${column}` : column,
    )
    .join(",");

/**
 * Reads a sort back from the URL. Like a filter, it is user input: a column
 * this list can't be sorted by, or one named twice, is dropped, not an error.
 * With nothing left, there is no sort (`undefined`).
 */
export function sortSchema<const Column extends string>(
  columns: readonly Column[],
) {
  return z
    .string()
    .transform((param): Sort<Column> | undefined => {
      const sort: SortTerm<Column>[] = [];
      for (const part of param.split(",")) {
        const descending = part.startsWith("-");
        const name = descending ? part.slice(1) : part;
        const column = columns.find((each) => each === name);
        if (column === undefined) continue;
        if (sort.some((term) => term.column === column)) continue;
        sort.push({
          column,
          direction: descending ? "descending" : "ascending",
        });
      }
      return sort.length > 0 ? sort : undefined;
    })
    .optional()
    .catch(undefined);
}

/**
 * The sort after the user picks a column.
 *
 * Alone, the column becomes the whole sort: ascending, or turned around if
 * the list was already sorted by it.
 *
 * With `combine`, the other terms stay. A new column goes last, ascending, as
 * the next tie-break. One already there turns around in its place, and leaves
 * the sort the time after: ascending, descending, gone.
 */
export function nextSort<Column extends string>(
  sort: Sort<Column>,
  column: Column,
  combine: boolean,
): Sort<Column> {
  const current = sort.find((term) => term.column === column);

  if (!combine) {
    const direction =
      current?.direction === "ascending" ? "descending" : "ascending";
    return [{ column, direction }];
  }
  if (!current) return [...sort, { column, direction: "ascending" }];
  if (current.direction === "descending") {
    return sort.filter((term) => term !== current);
  }
  return sort.map((term) =>
    term === current ? { column, direction: "descending" } : term,
  );
}
