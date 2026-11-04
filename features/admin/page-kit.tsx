import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

/** Common setup for admin pages: locale, dictionary, admin gate, RLS-bound client. */
export async function adminPage(params: Promise<{ locale: string }>) {
  const { locale: l } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  await requireAdmin(locale);
  return { locale, d, supabase: await createClient() };
}

export const toneFor = (s: string) =>
  ["published", "open", "paid", "accepted", "approved", "granted", "verified", "succeeded", "closed_ok"].includes(s) ? "success"
  : ["draft", "pending", "submitted", "under_review", "new", "in_progress"].includes(s) ? "warning"
  : ["rejected", "failed", "denied", "cancelled", "refunded"].includes(s) ? "danger" : "neutral";

export function AdminTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
