import { z } from "zod";
import { LOCALE } from "./format";

export const CurrencySchema = z.enum(["XOF", "GHS"]);
export type Currency = z.infer<typeof CurrencySchema>;

/**
 * An integer amount in the currency's smallest unit, as the API sends it.
 * The brand makes it a distinct type: a plain `number` (say, what the user
 * typed) can't be passed where money is expected without going through
 * `toMinorUnits` or the schema.
 */
export const MinorUnitsSchema = z.number().int().brand<"MinorUnits">();
export type MinorUnits = z.infer<typeof MinorUnitsSchema>;

const formatters = new Map<Currency, Intl.NumberFormat>();

function formatterFor(currency: Currency): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/** Decimals of a currency, asked to Intl instead of hardcoded: XOF has 0, GHS has 2. */
function exponent(currency: Currency): number {
  return formatterFor(currency).resolvedOptions().maximumFractionDigits ?? 0;
}

/** 15.5 GHS -> 1550. 5000 XOF -> 5000. */
export function toMinorUnits(major: number, currency: Currency): MinorUnits {
  const decimals = exponent(currency);
  // Rounding below takes out float noise (19.99 * 100 is 1998.9999999999998).
  // It must not also round away decimals the currency doesn't have: 1.005 GHS
  // would quietly become another amount, so it is refused instead.
  if (Number(major.toFixed(decimals)) !== major) {
    throw new RangeError(`${major} has more decimals than ${currency} allows`);
  }
  return MinorUnitsSchema.parse(Math.round(major * 10 ** decimals));
}

/** 5000 XOF -> "5 000 F CFA". 1550 GHS -> "15,50 GHS". */
export function formatMoney(amount: MinorUnits, currency: Currency): string {
  return formatterFor(currency).format(amount / 10 ** exponent(currency));
}
