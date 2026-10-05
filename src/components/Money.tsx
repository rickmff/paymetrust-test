import { cn } from "@heroui/react";
import { formatMoney, type Currency, type MinorUnits } from "@/lib/money";

type MoneyProps = {
  /** Branded: only an amount that came from the API (or `toMinorUnits`) fits. */
  amount: MinorUnits;
  currency: Currency;
  className?: string;
};

/** The only way money reaches the screen: formatted by Intl, digits aligned. */
export function Money({ amount, currency, className }: MoneyProps) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {formatMoney(amount, currency)}
    </span>
  );
}
