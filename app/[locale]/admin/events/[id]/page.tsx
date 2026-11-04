import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Table, Td } from "@/components/ui/primitives";
import { EventForm } from "@/features/admin/event-form";
import type { EventRow } from "@/features/content/queries";
export default async function EditEvent({ params }: PageProps<"/[locale]/admin/events/[id]">) {
  const { locale: l, id } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const supabase = await createClient();
  const isNew = id === "new";
  const [{ data: courses }, ev, regs] = await Promise.all([
    supabase.from("courses").select("id, title_en").order("title_en"),
    isNew ? Promise.resolve({ data: null }) : supabase.from("events").select("*").eq("id", id).maybeSingle(),
    isNew ? Promise.resolve({ data: [] }) : supabase.from("event_registrations").select("id, attendee_name, status, created_at").eq("event_id", id).order("created_at"),
  ]);
  if (!isNew && !ev.data) notFound();
  const e = (ev.data ?? undefined) as EventRow | undefined;
  return (
    <div className="space-y-6">
      <div><Link href={`/${locale}/admin/events`} className="text-sm font-semibold text-royal-600">← {d.admin.events}</Link><h1 className="mt-1 text-2xl font-extrabold text-navy-900">{isNew ? d.admin.newEvent : e?.title_en}</h1></div>
      <Card className="p-6"><EventForm d={d} e={e} courses={courses ?? []} /></Card>
      {!isNew && <section><h2 className="mb-3 font-bold text-navy-900">{d.admin.registrations} ({(regs.data ?? []).length})</h2>
        <Table head={[d.common.name, d.common.status, d.common.date]}>{(regs.data ?? []).map((r) => <tr key={r.id}><Td>{r.attendee_name}</Td><Td><Badge tone={r.status === "registered" ? "success" : "warning"}>{r.status}</Badge></Td><Td className="text-subtle">{formatDateTime(r.created_at, locale)}</Td></tr>)}</Table></section>}
    </div>
  );
}
