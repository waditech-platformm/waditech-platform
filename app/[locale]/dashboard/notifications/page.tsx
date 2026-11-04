import Link from "next/link";
import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { EmptyState } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { markAllReadAction } from "@/features/notifications/actions";
import { dashboardNav } from "../nav";
export default async function Notifications({ params }: PageProps<"/[locale]/dashboard/notifications">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireViewer(locale, "dashboard");
  const { data } = await (await createClient()).from("notifications").select("id, kind, title_en, title_ar, body_en, body_ar, link, read_at, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(100);
  const items = data ?? [];
  return (
    <PortalShell title={d.notifications.title} nav={dashboardNav(locale, d, viewer.roles)}
      actions={items.some((n) => !n.read_at) ? <ActionForm action={markAllReadAction}><SubmitButton variant="secondary" size="sm">{d.dashboard.markAllRead}</SubmitButton></ActionForm> : undefined}>
      {items.length === 0 ? <EmptyState title={d.notifications.empty} /> : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          {items.map((n) => {
            const link = n.link?.startsWith("/") ? `/${locale}${n.link}` : null;
            const body = <><p className="font-semibold text-navy-900">{!n.read_at && <span className="me-2 inline-block size-2 rounded-full bg-cyan-500" aria-label="unread" />}{pick(n, "title", locale)}</p><p className="text-sm text-muted">{pick(n, "body", locale)}</p><p className="mt-1 text-xs text-subtle">{formatDateTime(n.created_at, locale)}</p></>;
            return <li key={n.id} className={n.read_at ? "bg-white" : "bg-royal-50/40"}>{link ? <Link href={link} className="block p-4 hover:bg-surface">{body}</Link> : <div className="p-4">{body}</div>}</li>;
          })}
        </ul>
      )}
    </PortalShell>
  );
}
