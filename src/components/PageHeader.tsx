import type { ReactNode } from "react";
import { PageTitle } from "./PageTitle";

type PageHeaderProps = {
  /** The page's heading, and the title of its browser tab. */
  title: string;
  description?: string;
  /** Actions on the right, e.g. a "New payout" link. */
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <PageTitle>{title}</PageTitle>
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </header>
  );
}
