import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, formatDate, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, Card, ProgressBar } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Select } from "@/components/ui/form";
import { enrollAction } from "@/features/enrollments/actions";
import { listCourses } from "@/features/catalog/queries";

export default async function ChildPage({ params }: PageProps<"/[locale]/parent/children/[id]">) {
  const { locale: l, id } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireViewer(locale, "parent");
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("is_parent_of", { student: id });
  if (!allowed) notFound(); // unverified or someone else's child: indistinguishable from "not found"
  const [{ data: child }, { data: enr }, { data: att }, { data: subs }, { data: certs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", id).single(),
    supabase.from("enrollments").select("id, status, course_id, courses(slug, title_en, title_ar)").eq("student_id", id),
    supabase.from("attendance").select("status, marked_at, class_sessions(title, starts_at)").eq("student_id", id).order("marked_at", { ascending: false }).limit(20),
    supabase.from("submissions").select("status, grade_points, submitted_at, assignments(title_en, title_ar, max_points)").eq("student_id", id).order("submitted_at", { ascending: false }),
    supabase.from("certificates").select("certificate_number, course_title_en, course_title_ar, completion_date").eq("student_id", id),
  ]);
  const rows = (enr ?? []) as unknown as { id: string; status: string; course_id: string; courses: { slug: string; title_en: string; title_ar: string } }[];
  const prog = new Map(await Promise.all(rows.map(async (r) => [r.course_id, (((await supabase.rpc("course_progress", { p_course: r.course_id, p_student: id })).data ?? [])[0] as { percent: number } | undefined)?.percent ?? 0] as const)));
  const available = (await listCourses({ availability: "open" })).filter((c) => !rows.some((r) => r.course_id === c.id && !["cancelled", "refunded"].includes(r.status)));
  return (
    <PortalShell title={child?.full_name ?? ""} subtitle={d.parent.viewProgress} nav={[{ href: `/${locale}/parent`, label: d.parent.children, exact: true }]}>
      <div className="wt-stagger grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><h2 className="font-bold text-navy-900">{d.parent.enrollments}</h2>
          <ul className="mt-3 space-y-4">{rows.map((r) => (
            <li key={r.id}><div className="flex items-center justify-between gap-2"><span className="font-semibold">{pick(r.courses, "title", locale)}</span><Badge tone={r.status === "completed" ? "success" : r.status === "active" ? "blue" : "warning"}>{d.enums.enrollment[r.status as keyof typeof d.enums.enrollment]}</Badge></div>
              {["active", "completed"].includes(r.status) && <div className="mt-2 flex items-center gap-2 text-xs text-subtle"><ProgressBar value={prog.get(r.course_id) ?? 0} className="flex-1" label={d.dashboard.progress} />{prog.get(r.course_id) ?? 0}%</div>}</li>
          ))}{rows.length === 0 && <li className="text-sm text-muted">{d.dashboard.noCourses}</li>}</ul>
          {available.length > 0 && (
            <ActionForm action={enrollAction} className="mt-5 flex gap-2 border-t border-line pt-4">
              <input type="hidden" name="student_id" value={id} />
              <label htmlFor="course_id" className="sr-only">{d.parent.enrollChild}</label>
              <Select id="course_id" name="course_id" className="flex-1">{available.map((c) => <option key={c.id} value={c.id}>{pick(c, "title", locale)}</option>)}</Select>
              <SubmitButton size="md">{d.parent.enrollChild}</SubmitButton>
            </ActionForm>
          )}
        </Card>
        <Card className="p-5"><h2 className="font-bold text-navy-900">{d.parent.attendance}</h2>
          <ul className="mt-3 divide-y divide-line text-sm">{((att ?? []) as unknown as { status: string; class_sessions: { title: string | null; starts_at: string } }[]).map((a, i) => (
            <li key={i} className="flex justify-between py-2"><span>{a.class_sessions?.title ?? d.dashboard.session} · <span className="text-subtle">{formatDateTime(a.class_sessions.starts_at, locale)}</span></span><Badge tone={a.status === "present" ? "success" : a.status === "late" ? "warning" : "neutral"}>{d.enums.attendance[a.status as keyof typeof d.enums.attendance]}</Badge></li>
          ))}{(att ?? []).length === 0 && <li className="py-2 text-muted">{d.common.none}</li>}</ul>
        </Card>
        <Card className="p-5"><h2 className="font-bold text-navy-900">{d.dashboard.assignments}</h2>
          <ul className="mt-3 divide-y divide-line text-sm">{((subs ?? []) as unknown as { status: string; grade_points: number | null; assignments: { title_en: string; title_ar: string; max_points: number } }[]).map((s, i) => (
            <li key={i} className="flex justify-between py-2"><span>{pick(s.assignments, "title", locale)}</span><Badge tone={s.status === "graded" ? "success" : "blue"}>{s.status === "graded" ? `${s.grade_points}/${s.assignments.max_points}` : d.assignment.submitted}</Badge></li>
          ))}{(subs ?? []).length === 0 && <li className="py-2 text-muted">{d.common.none}</li>}</ul>
        </Card>
        <Card className="p-5"><h2 className="font-bold text-navy-900">{d.dashboard.certificates}</h2>
          <ul className="mt-3 space-y-2 text-sm">{(certs ?? []).map((c) => <li key={c.certificate_number}><Link className="font-semibold text-royal-600" href={`/${locale}/certificates/${c.certificate_number}`}>{pick(c, "course_title", locale)}</Link> <span className="text-xs text-subtle">{formatDate(c.completion_date, locale)}</span></li>)}{(certs ?? []).length === 0 && <li className="text-muted">{d.dashboard.noCertificates}</li>}</ul>
        </Card>
      </div>
    </PortalShell>
  );
}
