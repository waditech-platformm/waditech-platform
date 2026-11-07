import Link from "next/link";
import { isLocale, formatDateTime, formatMoney, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, Stat, Table, Td } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

type O = { students: number; active_enrollments: number; published_courses: number; pending_enrollments: number; pending_links: number; pending_projects: number; new_messages: number; pending_scholarships: number; paid_orders: number; paid_total_jod: number; paid_total_usd: number; enrollments_by_category: { category: string; n: number }[] };
export default async function AdminHome({ params }: PageProps<"/[locale]/admin">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const supabase = await createClient();
  const [{ data }, { data: audit }] = await Promise.all([supabase.rpc("admin_overview"), supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(12)]);
  const o = data as O;
  const max = Math.max(1, ...o.enrollments_by_category.map((x) => x.n));
  const pend = [[d.enums.enrollment.pending_approval, o.pending_enrollments, "/enrollments?status=pending_approval"], [d.admin.families, o.pending_links, "/families"], [d.admin.projects, o.pending_projects, "/projects"], [d.admin.messages, o.new_messages, "/messages"], [d.admin.scholarships, o.pending_scholarships, "/scholarships"]] as const;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold text-navy-900">{d.admin.overview}</h1>
        <div className="flex gap-2"><ButtonLink href={`/${locale}/admin/courses/new`} size="sm">{d.admin.newCourse}</ButtonLink><ButtonLink href={`/${locale}/admin/news/new`} size="sm" variant="secondary">{d.admin.newArticle}</ButtonLink><ButtonLink href={`/${locale}/admin/events/new`} size="sm" variant="secondary">{d.admin.newEvent}</ButtonLink></div></div>
      <div className="wt-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={d.admin.totalStudents} value={o.students} />
        <Stat label={d.admin.activeEnrollments} value={o.active_enrollments} />
        <Stat label={d.admin.publishedCourses} value={o.published_courses} />
        <Stat label={d.admin.revenue} value={formatMoney(Number(o.paid_total_jod), "JOD", locale)} hint={`${o.paid_orders} · ${formatMoney(Number(o.paid_total_usd), "USD", locale)}`} />
      </div>
      <div className="wt-stagger grid gap-6 lg:grid-cols-3">
        <Card className="p-5"><h2 className="font-bold text-navy-900">{d.admin.pendingItems}</h2>
          <ul className="mt-3 space-y-2 text-sm">{pend.map(([label, n, href]) => <li key={href}><Link href={`/${locale}/admin${href}`} className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-surface"><span>{label}</span><span className={`font-bold ${n ? "text-warning" : "text-subtle"}`}>{n}</span></Link></li>)}</ul></Card>
        <Card className="p-5 lg:col-span-2"><h2 className="font-bold text-navy-900">{d.admin.enrollments} · {d.programs.category}</h2>
          <ul className="mt-4 space-y-3">{o.enrollments_by_category.map((x) => (
            <li key={x.category} className="grid grid-cols-[140px_1fr_40px] items-center gap-3 text-sm"><span className="truncate">{d.enums.category[x.category as keyof typeof d.enums.category]}</span>
              <span className="h-3 rounded-full bg-royal-50"><span className="block h-3 rounded-full bg-action" style={{ width: `${(x.n / max) * 100}%` }} /></span><span className="text-end font-semibold tabular-nums">{x.n}</span></li>
          ))}</ul></Card>
      </div>
      <section><h2 className="mb-3 font-bold text-navy-900">{d.admin.recentActivity}</h2>
        <Table head={[d.common.date, d.common.actions, "Entity", "ID"]}>{(audit ?? []).map((a) => <tr key={a.id}><Td className="whitespace-nowrap text-subtle">{formatDateTime(a.created_at, locale)}</Td><Td className="font-semibold">{a.action}</Td><Td>{a.entity_type}</Td><Td className="font-latin text-xs text-subtle">{a.entity_id?.slice(0, 8)}</Td></tr>)}</Table>
      </section>
    </div>
  );
}
