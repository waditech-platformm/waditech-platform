import Link from "next/link";
import { isLocale, pick, formatDateTime, formatMoney, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, EmptyState, Table, Td } from "@/components/ui/primitives";
import { dashboardNav } from "../nav";
export default async function Payments({ params }: PageProps<"/[locale]/dashboard/payments">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireViewer(locale, "dashboard");
  const { data } = await (await createClient()).from("orders").select("id, order_number, total, currency, status, is_sandbox, created_at, courses(title_en, title_ar)").order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as { id: string; order_number: string; total: number; currency: string; status: string; is_sandbox: boolean; created_at: string; courses: { title_en: string; title_ar: string } }[];
  return (
    <PortalShell title={d.dashboard.orders} nav={dashboardNav(locale, d, viewer.roles)}>
      {rows.length === 0 ? <EmptyState title={d.common.emptyTitle} /> : (
        <Table head={[d.checkout.order, d.nav.programs, d.checkout.total, d.common.status, d.common.date]}>
          {rows.map((o) => (
            <tr key={o.id}>
              <Td className="font-latin">{o.status === "pending" ? <Link href={`/${locale}/checkout/${o.id}`} className="font-semibold text-royal-600">{o.order_number}</Link> : o.order_number}{o.is_sandbox && <Badge tone="warning" className="ms-2">sandbox</Badge>}</Td>
              <Td>{pick(o.courses, "title", locale)}</Td>
              <Td className="font-semibold">{formatMoney(Number(o.total), o.currency, locale)}</Td>
              <Td><Badge tone={o.status === "paid" ? "success" : o.status === "pending" ? "warning" : "neutral"}>{d.enums.order[o.status as keyof typeof d.enums.order]}</Badge></Td>
              <Td className="text-subtle">{formatDateTime(o.created_at, locale)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </PortalShell>
  );
}
