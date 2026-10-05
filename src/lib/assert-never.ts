/**
 * Exhaustiveness check. Put it in the `default` of a switch over a union:
 * when someone adds a new member (a new status), every switch that forgot it
 * stops compiling.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
