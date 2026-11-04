import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CalendarClock, ClipboardList, Award, Bell, Sparkles, KeyRound } from "lucide-react";
import { isLocale, pick, formatDateTime, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { homePath } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Alert, Badge, Card, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { CourseCard } from "@/components/cards";
import { listCourses } from "@/features/catalog/queries";
import { dashboardNav } from "./nav";

export default async function StudentDashboard({ params, searchParams }: PageProps<"/[locale]/dashboard">) {
  const { locale: l } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const viewer = await requireViewer(locale, "dashboard", `/${locale}/dashboard`);
  if (!viewer.roles.includes("student")) redirect(`/${locale}${homePath(viewer.roles)}`);
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: enrollments } = await supabase.from("enrollments")
    .select("id, status, course_id, courses(id, slug, title_en, title_ar, thumbnail_url, category, is_test_data)")
    .eq("student_id", viewer.id).in("status", ["active", "completed", "pending_payment", "pending_approval"]).order("enrolled_at", { ascending: false });
  const rows = (enrollments ?? []) as unknown as { id: string; status: string; course_id: string; courses: { id: string; slug: string; title_en: string; title_ar: string; thumbnail_url: string | null; category: string; is_test_data: boolean } }[];
  const activeIds = rows.filter((r) => ["active", "completed"].includes(r.status)).map((r) => r.course_id);
  const progress = await Promise.all(activeIds.map(async (id) => {
    const { data } = await supabase.rpc("course_progress", { p_course: id, p_student: viewer.id });
    return [id, ((data ?? [])[0] as { percent: number } | undefined)?.percent ?? 0] as const;
  }));
  const pmap = new Map(progress);
  const now = new Date().toISOString();
  const in30 = daysFromNowIso(30);
  const [{ data: sessions }, { data: assignments }, { data: attempts }, { data: certs }, { data: notes }, { data: subs }] = await Promise.all([
    activeIds.length ? supabase.from("class_sessions").select("id, title, starts_at, location, course_id").in("course_id", activeIds).gte("starts_at", now).lte("starts_at", in30).order("starts_at").limit(5) : Promise.resolve({ data: [] }),
    activeIds.length ? supabase.from("assignments").select("id, title_en, title_ar, due_at, course_id").in("course_id", activeIds).eq("status", "published").order("due_at").limit(10) : Promise.resolve({ data: [] }),
    supabase.from("assessment_attempts").select("id, score_percent, passed, status, submitted_at, assessments(title_en, title_ar)").eq("student_id", viewer.id).neq("status", "in_progress").order("submitted_at", { ascending: false }).limit(5),
    supabase.from("certificates").select("certificate_number, course_title_en, course_title_ar, completion_date, status").eq("student_id", viewer.id).order("issued_at", { ascending: false }),
    supabase.from("notifications").select("id, title_en, title_ar, body_en, body_ar, link, read_at, created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(4),
    supabase.from("submissions").select("assignment_id, status, grade_points").eq("student_id", viewer.id),
  ]);
  const subMap = new Map((subs ?? []).map((s) => [s.assignment_id, s]));
  const courseSlug = new Map(rows.map((r) => [r.course_id, r.courses.slug]));
  const cats = new Set(rows.map((r) => r.courses.category));
  const recs = (await listCourses()).filter((c) => !rows.some((r) => r.course_id === c.id) && (cats.size === 0 || cats.has(c.category) || c.featured)).slice(0, 3);
  const first = viewer.profile.full_name.trim() || d.auth.student;

  return (
    <PortalShell title={`${d.dashboard.hello}, ${first}`} subtitle={d.dashboard.studentTitle} nav={dashboardNav(locale, d, viewer.roles)}>
      {sp.welcome && <Alert tone="success" className="mb-6">{d.auth.confirmed}</Alert>}
      {sp.reset && <Alert tone="success" className="mb-6">{d.auth.resetDone}</Alert>}
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-bold text-navy-900">{d.dashboard.myCourses}</h2>
            {rows.length === 0 ? (
              <EmptyState title={d.dashboard.noCourses} action={<ButtonLink href={`/${locale}/programs`}>{d.dashboard.browse}</ButtonLink>} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {rows.map((r) => {
                  const pct = pmap.get(r.course_id) ?? 0;
                  const learnable = ["active", "completed"].includes(r.status);
                  return (
                    <Card key={r.id} className="flex gap-4 p-4">
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-navy-900">{r.courses.thumbnail_url && <Image src={r.courses.thumbnail_url} alt="" fill sizes="80px" className="object-cover" />}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-navy-900">{pick(r.courses, "title", locale)}</p>
                        <Badge tone={r.status === "completed" ? "success" : r.status === "active" ? "blue" : "warning"} className="mt-1">{d.enums.enrollment[r.status as keyof typeof d.enums.enrollment]}</Badge>
                        {learnable && <div className="mt-3"><ProgressBar value={pct} label={d.dashboard.progress} /><p className="mt-1 text-xs text-subtle">{pct}%</p></div>}
                        <div className="mt-2">
                          {learnable
                            ? <Link href={`/${locale}/learn/${r.courses.slug}`} className="text-sm font-semibold text-royal-600">{d.dashboard.continueLearning} →</Link>
                            : <Link href={`/${locale}/programs/${r.courses.slug}`} className="text-sm font-semibold text-royal-600">{d.common.learnMore}</Link>}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-bold text-navy-900"><CalendarClock className="size-5 text-royal-600" aria-hidden />{d.dashboard.upcoming}</h2>
              <ul className="mt-3 divide-y divide-line text-sm">
                {(sessions ?? []).map((s) => <li key={s.id} className="py-2.5"><p className="font-semibold">{s.title ?? d.dashboard.session}</p><p className="text-xs text-subtle">{formatDateTime(s.starts_at, locale)}{s.location ? ` · ${s.location}` : ""}</p></li>)}
                {(sessions ?? []).length === 0 && <li className="py-2.5 text-muted">{d.dashboard.noUpcoming}</li>}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-bold text-navy-900"><ClipboardList className="size-5 text-royal-600" aria-hidden />{d.dashboard.assignments}</h2>
              <ul className="mt-3 divide-y divide-line text-sm">
                {(assignments ?? []).map((a) => {
                  const s = subMap.get(a.id);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                      <Link href={`/${locale}/learn/${courseSlug.get(a.course_id)}/assignment/${a.id}`} className="min-w-0 font-semibold hover:text-royal-700"><span className="block truncate">{pick(a, "title", locale)}</span>{a.due_at && <span className="text-xs font-normal text-subtle">{d.dashboard.due}: {formatDate(a.due_at, locale)}</span>}</Link>
                      <Badge tone={s ? (s.status === "graded" ? "success" : "blue") : "warning"}>{s ? (s.status === "graded" ? `${d.assignment.graded} · ${s.grade_points}` : d.assignment.submitted) : d.dashboard.due}</Badge>
                    </li>
                  );
                })}
                {(assignments ?? []).length === 0 && <li className="py-2.5 text-muted">{d.common.none}</li>}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="font-bold text-navy-900">{d.dashboard.quizResults}</h2>
              <ul className="mt-3 divide-y divide-line text-sm">
                {((attempts ?? []) as unknown as { id: string; score_percent: number; passed: boolean | null; status: string; assessments: { title_en: string; title_ar: string } }[]).map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5"><span className="truncate">{pick(t.assessments, "title", locale)}</span>
                    <Badge tone={t.status === "needs_review" ? "warning" : t.passed ? "success" : "danger"}>{t.status === "needs_review" ? d.dashboard.inReview : `${Math.round(t.score_percent)}%`}</Badge></li>
                ))}
                {(attempts ?? []).length === 0 && <li className="py-2.5 text-muted">{d.dashboard.noQuizResults}</li>}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-bold text-navy-900"><Award className="size-5 text-royal-600" aria-hidden />{d.dashboard.certificates}</h2>
              <ul className="mt-3 divide-y divide-line text-sm">
                {(certs ?? []).map((c) => <li key={c.certificate_number} className="py-2.5"><Link href={`/${locale}/certificates/${c.certificate_number}`} className="font-semibold hover:text-royal-700">{pick(c, "course_title", locale)}</Link><p className="font-latin text-xs text-subtle">{c.certificate_number}</p></li>)}
                {(certs ?? []).length === 0 && <li className="py-2.5 text-muted">{d.dashboard.noCertificates}</li>}
              </ul>
            </Card>
          </section>

          {recs.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-navy-900"><Sparkles className="size-5 text-cyan-600" aria-hidden />{d.dashboard.recommendations}</h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{recs.map((c) => <CourseCard key={c.id} c={c} locale={locale} d={d} />)}</div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-bold text-navy-900"><KeyRound className="size-5 text-royal-600" aria-hidden />{d.dashboard.familyCode}</h2>
            <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-center font-latin text-2xl font-extrabold tracking-[0.25em] text-navy-900" dir="ltr">{viewer.profile.family_link_code}</p>
            <p className="mt-2 text-xs text-subtle">{d.dashboard.familyCodeHelp}</p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-bold text-navy-900"><Bell className="size-5 text-royal-600" aria-hidden />{d.dashboard.notifications}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {(notes ?? []).map((n) => (
                <li key={n.id} className={n.read_at ? "opacity-70" : ""}>
                  <p className="font-semibold">{!n.read_at && <span className="me-1.5 inline-block size-2 rounded-full bg-cyan-500" aria-hidden />}{pick(n, "title", locale)}</p>
                  <p className="text-xs text-subtle">{pick(n, "body", locale)}</p>
                </li>
              ))}
              {(notes ?? []).length === 0 && <li className="text-muted">{d.dashboard.noNotifications}</li>}
            </ul>
            <Link href={`/${locale}/dashboard/notifications`} className="mt-4 inline-block text-sm font-semibold text-royal-600">{d.common.viewAll}</Link>
          </Card>
        </aside>
      </div>
    </PortalShell>
  );
}

function daysFromNowIso(days: number) {
  return new Date(Date.now() + days * 864e5).toISOString();
}
