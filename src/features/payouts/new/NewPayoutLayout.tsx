import { Card, cn } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { useState } from "react";
import { Link, Outlet, useMatch } from "react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  STEP_LABEL,
  STEPS,
  useDraft,
  type PayoutWizard,
  type ServerErrors,
} from "./wizard";

/**
 * Layout route of the wizard. It owns what must outlive a single step (the
 * draft and the server's errors) and hands it to the step routes through the
 * Outlet context. Each step is its own URL with its own small form.
 */
export function NewPayoutLayout() {
  const { draft, save, discard } = useDraft();
  const [serverErrors, setServerErrors] = useState<ServerErrors>();
  const current = useMatch("/payouts/new/:step")?.params.step;

  const wizard: PayoutWizard = {
    draft,
    saveStep: (values) => {
      save(values);
      setServerErrors(undefined);
    },
    discard,
    serverErrors,
    setServerErrors,
  };

  return (
    <>
      <PageHeader
        title="New payout"
        description="Nothing is sent until a second person approves it."
      >
        <Link
          to="/payouts"
          onClick={discard}
          className={buttonVariants({ size: "sm", variant: "tertiary" })}
        >
          Cancel
        </Link>
      </PageHeader>

      <ol aria-label="Steps" className="flex gap-2 text-sm">
        {STEPS.map((step, index) => (
          <li
            key={step}
            aria-current={step === current ? "step" : undefined}
            className={cn(
              "rounded-full px-3 py-1",
              step === current
                ? "bg-accent text-accent-foreground"
                : "bg-default text-muted",
            )}
          >
            {index + 1}. {STEP_LABEL[step]}
          </li>
        ))}
      </ol>

      <Card className="max-w-xl">
        <Card.Content>
          <Outlet context={wizard} />
        </Card.Content>
      </Card>
    </>
  );
}
