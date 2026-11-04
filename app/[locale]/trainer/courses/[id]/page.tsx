import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, Card, EmptyState, ProgressBar, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input, Label, Select } from "@/components/ui/form";
import { completeEnrollmentAction, createSessionAction, issueCertificateAction, markAttendanceAction } from "@/features/trainer/actions";
import { trainerNav } from "../../nav";

export default async function TrainerCourse({ params, searchParams }: PageProps<"/[locale]/trainer/courses/[id]">) {
  const { locale: l, id } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireViewer(locale, "trainer");
  const supabase = await createClient();
  const { data: staff } = await supabase.rpc("is_course_staff", { course: id });
  if (!staff) notFound();
  const { data: course } = await supabase.from("courses").select("id, slug, title_en, title_ar").eq("id", id).single();
  if (!course) notFound();
  const [{ data: enrollments }, { data: sessions }, { data: certs }] = await Promise.all([
    supabase.from("enrollments").select("id, student_id, status, profiles:student_id(full_name)").eq("course_id", id).in("status", ["active", "completed"]),
    supabase.from("class_sessions").select("id, title, starts_at, location").eq("course_id", id).order("starts_at", { ascending: false }),
    supabase.from("certificates").select("enrollment_id, certificate_number").eq("course_id", id),
  ]);
  const roster = (enrollments ?? []) as unknown as { id: string; student_id: string; status: string; profiles: { full_name: string } | null }[];
  const prog = new Map(await Promise.all(roster.map(async (r) => [r.student_id, (((await supabase.rpc("course_progress", { p_course: id, p_student: r.student_id })).data ?? [])[0] as { percent: number } | undefined)?.percent ?? 0] as const)));
  const certMap = new Map((certs ?? []).map((c) => [c.enrollment_id, c.certificate_number]));
  const sp = await searchParams;
  const sessionId = typeof sp.session === "string" ? sp.session : sessions?.[0]?.id;
  const { data: att } = sessionId ? await supabase.from("attendance").select("student_id, status").eq("session_id", sessionId) : { data: [] };
  const attMap = new Map((att ?? []).map((a) => [a.student_id, a.status]));
  return (
    <PortalShell title={pick(course, "title", locale)} subtitle={d.trainer.roster} nav={trainerNav(locale, d)}
      actions={<Link href={`/${locale}/admin/courses/${course.id}`} className="text-sm font-semibold text-royal-600">{d.trainer.editContent}</Link>}>
      <section>
        <h2 className="mb-3 text-lg font-bold text-navy-900">{d.trainer.students}</h2>
        {roster.length === 0 ? <EmptyState title={d.trainer.noStudents} /> : (
          <Table head={[d.common.name, d.trainer.progress, d.common.status, d.common.actions]}>
            {roster.map((r) => {
              const pct = prog.get(r.student_id) ?? 0;
              const cert = certMap.get(r.id);
              return (
                <tr key={r.id}>
                  <Td className="font-semibold">{r.profiles?.full_name ?? "—"}</Td>
                  <Td className="w-48"><ProgressBar value={pct} label={d.trainer.progress} /><span className="text-xs text-subtle">{pct}%</span></Td>
                  <Td><Badge tone={r.status === "completed" ? "success" : "blue"}>{d.enums.enrollment[r.status as keyof typeof d.enums.enrollment]}</Badge></Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      {r.status === "active" && <ActionForm action={completeEnrollmentAction}><input type="hidden" name="enrollment_id" value={r.id} /><SubmitButton size="sm" variant="secondary">{d.trainer.completeEnrollment}</SubmitButton></ActionForm>}
                      {cert ? <Link href={`/${locale}/certificates/${cert}`} className="font-latin text-sm font-semibold text-royal-600">{cert}</Link>
                        : <ActionForm action={issueCertificateAction}><input type="hidden" name="enrollment_id" value={r.id} /><SubmitButton size="sm">{d.trainer.issueCertificate}</SubmitButton></ActionForm>}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit p-5">
          <h2 className="font-bold text-navy-900">{d.trainer.newSession}</h2>
          <ActionForm action={createSessionAction} resetOnSuccess className="mt-3 space-y-3">
            <input type="hidden" name="course_id" value={course.id} />
            <div><Label htmlFor="title">{d.trainer.sessionTitle}</Label><Input id="title" name="title" /></div>
            <div><Label htmlFor="starts_at">{d.trainer.startsAt}</Label><Input id="starts_at" name="starts_at" type="datetime-local" required /></div>
            <div><Label htmlFor="location">{d.trainer.location}</Label><Input id="location" name="location" /></div>
            <SubmitButton size="sm">{d.common.create}</SubmitButton>
          </ActionForm>
          <ul className="mt-5 space-y-1 text-sm">{(sessions ?? []).map((s) => (
            <li key={s.id}><Link href={`?session=${s.id}`} className={`block rounded-lg px-2 py-1.5 ${s.id === sessionId ? "bg-royal-50 font-semibold text-royal-700" : "hover:bg-surface"}`}>{s.title ?? d.dashboard.session} · <span className="text-xs text-subtle">{formatDateTime(s.starts_at, locale)}</span></Link></li>
          ))}</ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-navy-900">{d.trainer.markAttendance}</h2>
          {!sessionId || roster.length === 0 ? <p className="mt-3 text-sm text-muted">{d.common.none}</p> : (
            <ActionForm action={markAttendanceAction} className="mt-3">
              <input type="hidden" name="session_id" value={sessionId} /><input type="hidden" name="course_id" value={course.id} />
              <ul className="divide-y divide-line">{roster.map((r) => (
                <li key={r.student_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-semibold">{r.profiles?.full_name}</span>
                  <Select name={`s_${r.student_id}`} defaultValue={attMap.get(r.student_id) ?? ""} className="h-9 w-40" aria-label={`${d.trainer.attendance}: ${r.profiles?.full_name}`}>
                    <option value="">—</option>{(["present", "late", "absent", "excused"] as const).map((s) => <option key={s} value={s}>{d.enums.attendance[s]}</option>)}
                  </Select>
                </li>
              ))}</ul>
              <SubmitButton className="mt-4" pendingLabel={d.common.saving}>{d.common.save}</SubmitButton>
            </ActionForm>
          )}
        </Card>
      </section>
    </PortalShell>
  );
}
