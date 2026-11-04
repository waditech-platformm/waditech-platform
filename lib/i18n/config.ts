export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (locales as readonly string[]).includes(v);
}
export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
/** Pick the localized field from a bilingual DB row, e.g. pick(row, "title", "ar") -> row.title_ar */
export function pick<T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string {
  const v = row[`${field}_${locale}`] ?? row[`${field}_en`];
  return typeof v === "string" ? v : "";
}
export function pickArr<T extends Record<string, unknown>>(row: T, field: string, locale: Locale): string[] {
  const v = row[`${field}_${locale}`];
  const fallback = row[`${field}_en`];
  if (Array.isArray(v) && v.length) return v as string[];
  return Array.isArray(fallback) ? (fallback as string[]) : [];
}

const numberLocale: Record<Locale, string> = { en: "en-JO", ar: "ar-JO" };
export function formatMoney(amount: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(numberLocale[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JOD" ? 2 : 2,
    maximumFractionDigits: currency === "JOD" ? 3 : 2,
  }).format(amount);
}
export function formatDate(d: string | Date, locale: Locale, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat(numberLocale[locale], { timeZone: "Asia/Amman", ...opts }).format(new Date(d));
}
export function formatDateTime(d: string | Date, locale: Locale) {
  return formatDate(d, locale, { dateStyle: "medium", timeStyle: "short" });
}
export function formatNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(numberLocale[locale]).format(n);
}
