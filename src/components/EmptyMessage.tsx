import { EmptyState } from "@heroui/react";
import type { ReactNode } from "react";

type EmptyMessageProps = {
  title: string;
  description?: string;
  /** The next step, e.g. a "Clear filters" button. */
  children?: ReactNode;
};

export function EmptyMessage({
  title,
  description,
  children,
}: EmptyMessageProps) {
  return (
    <EmptyState className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted">{description}</p>}
      {children}
    </EmptyState>
  );
}
