/**
 * Formatting locale: the market convention (Côte d'Ivoire), not the UI language.
 * In the real product this would come from the merchant's profile.
 */
export const LOCALE = "fr-CI";

const dateTime = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "short",
  timeStyle: "short",
});
const time = new Intl.DateTimeFormat(LOCALE, { timeStyle: "medium" });
const percent = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  maximumFractionDigits: 1,
});

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatTime = (timestamp: number) => time.format(timestamp);
export const formatPercent = (ratio: number) => percent.format(ratio);

/** "+2250701020304" -> "+225 07 01 02 03 04" */
export const formatPhone = (e164: string) =>
  e164.replace(
    /^(\+225)(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
    "$1 $2 $3 $4 $5 $6",
  );
