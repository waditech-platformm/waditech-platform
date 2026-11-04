import Link from "next/link";
import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Badge, DemoBadge, Table, Td } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
export default async function AdminEvents({ params }: PageProps<"/[locale]/admin/events">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const { data } = await (await createClient()).from("events").select("id, title_en, title_ar, status, starts_at, capacity, is_test_data, event_registrations(count)").order("starts_at", { ascending: false });
  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><h1 className="text-2xl font-extrabold text-navy-900">{d.admin.events}</h1><ButtonLink href={`/${locale}/admin/events/new`}>{d.admin.newEvent}</ButtonLink></div>
      <Table head={[d.admin.titleEn, d.admin.startsAt, d.admin.registrations, d.common.status]}>{((data ?? []) as unknown as { id: string; title_en: string; title_ar: string; status: string; starts_at: string; capacity: number | null; is_test_data: boolean; event_registrations: { count: number }[] }[]).map((e) => (
        <tr key={e.id}><Td><Link href={`/${locale}/admin/events/${e.id}`} className="font-semibold text-royal-700 hover:underline">{pick(e, "title", locale)}</Link> <DemoBadge show={e.is_test_data} label={d.common.demoBadge} /></Td><Td className="text-subtle">{formatDateTime(e.starts_at, locale)}</Td>
          <Td>{e.event_registrations[0]?.count ?? 0}{e.capacity ? ` / ${e.capacity}` : ""}</Td><Td><Badge tone={e.status === "published" ? "success" : e.status === "cancelled" ? "danger" : "neutral"}>{d.events.status[e.status as keyof typeof d.events.status]}</Badge></Td></tr>
      ))}</Table>
    </div>
  );
}
