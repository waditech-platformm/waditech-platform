import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Alert, Card, DemoBadge, ProgressBar, Stat, Table, Td } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/button";

type Overview = { students: { id: string; full_name: string; enrollments: number; avg_progress: number | null; attendance_rate: number | null; certificates: number }[]; trainers: { id: string; full_name: string }[]; enrollments: { course_title_en: string; course_title_ar: string; n: number }[] };

export default async function SchoolPortal({ params, searchParams }: PageProps<"/[locale]/school">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireViewer(locale, "school", `/${locale}/school`);
  const supabase = await createClient();
  // RLS: coordinators only see organizations they belong to
  const { data: orgs } = await supabase.from("organizations").select("id, name, name_ar, city, is_test_data").order("name");
  const sp = await searchParams;
  const org = (orgs ?? []).find((o) => o.id === sp.org) ?? (orgs ?? [])[0];
  if (!org) return <PortalShell title={d.school.title} nav={[]}><Alert tone="info">{d.school.noOrg}</Alert></PortalShell>;
  const { data, error } = await supabase.rpc("school_overview", { p_org: org.id });
  if (error) return <PortalShell title={d.school.title} nav={[]}><Alert tone="danger">{d.errors.forbidden}</Alert></PortalShell>;
  const o = data as Overview;
  const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };
  return (
    <PortalShell title={locale === "ar" && org.name_ar ? org.name_ar : org.name} subtitle={d.school.title}
      nav={(orgs ?? []).map((x) => ({ href: `/${locale}/school?org=${x.id}`, label: locale === "ar" && x.name_ar ? x.name_ar : x.name }))}
      actions={<a href={`/api/school/report?org=${org.id}`} className={buttonClass("secondary", "sm")}>{d.school.report} (CSV)</a>}>
      <DemoBadge show={org.is_test_data} label={d.common.demoBadge} />
      <div className="mb-8 mt-3 grid gap-4 sm:grid-cols-3">
        <Stat label={d.school.students} value={o.students.length} />
        <Stat label={d.school.avgProgress} value={`${avg(o.students.map((s) => s.avg_progress))}%`} />
        <Stat label={d.school.attendanceRate} value={`${avg(o.students.map((s) => s.attendance_rate))}%`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Table head={[d.common.name, d.parent.enrollments, d.school.avgProgress, d.school.attendanceRate, d.dashboard.certificates]}>
          {o.students.map((s) => (
            <tr key={s.id}><Td className="font-semibold">{s.full_name}</Td><Td>{s.enrollments}</Td>
              <Td className="w-40"><ProgressBar value={s.avg_progress ?? 0} label={d.school.avgProgress} /><span className="text-xs text-subtle">{s.avg_progress ?? 0}%</span></Td>
              <Td>{s.attendance_rate ?? "—"}{s.attendance_rate !== null && "%"}</Td><Td>{s.certificates}</Td></tr>
          ))}
        </Table>
        <div className="space-y-6">
          <Card className="p-5"><h2 className="font-bold text-navy-900">{d.school.enrollments}</h2><ul className="mt-3 space-y-2 text-sm">{o.enrollments.map((e) => <li key={e.course_title_en} className="flex justify-between"><span>{pick(e, "course_title", locale)}</span><span className="font-bold">{e.n}</span></li>)}</ul></Card>
          <Card className="p-5"><h2 className="font-bold text-navy-900">{d.school.trainers}</h2><ul className="mt-3 space-y-1 text-sm">{o.trainers.map((t) => <li key={t.id}>{t.full_name}</li>)}</ul></Card>
        </div>
      </div>
    </PortalShell>
  );
}
