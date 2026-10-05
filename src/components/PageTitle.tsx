/**
 * The title of the browser tab: what a screen reader announces first, and
 * what tells one tab or one history entry from another. React moves a
 * <title> rendered anywhere in the tree into <head>, and takes it out again
 * when the page unmounts.
 */
export function PageTitle({ children }: { children: string }) {
  return <title>{`${children} · Merchant Console`}</title>;
}
