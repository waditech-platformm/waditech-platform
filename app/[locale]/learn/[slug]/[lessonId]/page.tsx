import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, CheckCircle2, FileDown } from "lucide-react";
import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getLearnContext } from "@/features/learning/queries";
import { CourseOutline } from "@/features/learning/ui/outline";
import { VideoLesson } from "@/features/learning/ui/video-lesson";
import { AssistantPanel } from "@/features/learning/ui/assistant";
import { completeLessonAction, saveNoteAction, deleteNoteAction } from "@/features/learning/actions";
import { Markdown } from "@/components/markdown";
import { Alert, Badge, Card, Container, DemoBadge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Textarea } from "@/components/ui/form";

export default async function LessonPage({ params }: PageProps<"/[locale]/learn/[slug]/[lessonId]">) {
  const { locale: l, slug, lessonId } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const viewer = await requireViewer(locale, "learn", `/${locale}/learn/${slug}/${lessonId}`);
  const ctx = await getLearnContext(slug, viewer.id);
  if (!ctx) notFound();
  const idx = ctx.lessons.findIndex((x) => x.id === lessonId);
  const lesson = ctx.lessons[idx];
  const enrolled = ctx.enrollment && ["active", "completed"].includes(ctx.enrollment.status);
  if (!lesson) {
    if (!enrolled) return <Container className="py-16"><Alert tone="warning">{d.learn.notEnrolled}</Alert><ButtonLink href={`/${locale}/programs/${slug}`} className="mt-4">{d.programs.enroll}</ButtonLink></Container>;
    notFound();
  }
  const supabase = await createClient();
  const [{ data: resources }, { data: notes }, { data: lab }] = await Promise.all([
    supabase.from("lesson_resources").select("id, title, url, kind").eq("lesson_id", lesson.id).order("position"),
    enrolled ? supabase.from("lesson_notes").select("id, body, created_at").eq("lesson_id", lesson.id).eq("student_id", viewer.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    lesson.lab_id ? supabase.from("labs").select("slug, title_en, title_ar, launch_url").eq("id", lesson.lab_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const prog = ctx.progress.get(lesson.id);
  const complete = prog?.status === "completed";
  const prev = ctx.lessons[idx - 1];
  const next = ctx.lessons[idx + 1];
  const allDone = ctx.lessons.every((x) => ctx.progress.get(x.id)?.status === "completed");
  const ruleHelp = { video_90: d.learn.watchToComplete, quiz_pass: d.learn.passQuizToComplete, assignment_submitted: d.learn.submitToComplete, manual: d.learn.manualComplete, view: "" }[lesson.completion_rule] ?? "";
  // the database re-checks the rule (e.g. 90% watched): this only decides whether to show the button
  const canSelfComplete = enrolled && !complete && ["view", "video_90"].includes(lesson.completion_rule);
  const p = (s: string) => `/${locale}/learn/${slug}${s}`;
  const arrowS = <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />;
  const arrowE = <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;

  return (
    <Container className="py-8">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href={`/${locale}/dashboard`} className="hover:text-navy-900">{d.dashboard.myCourses}</Link><span>/</span>
        <span className="font-semibold text-navy-900">{pick(ctx.course, "title", locale)}</span><DemoBadge show={ctx.course.is_test_data} label={d.common.demoBadge} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="order-2 space-y-4 lg:order-1">
          <CourseOutline locale={locale} d={d} slug={slug} modules={ctx.modules} lessons={ctx.lessons} progress={ctx.progress} currentId={lesson.id} />
        </aside>
        <article className="order-1 min-w-0 space-y-6 lg:order-2">
          {!enrolled && <Alert tone="info">{d.programs.previewLesson} · {d.learn.notEnrolled}</Alert>}
          {allDone && enrolled && <Alert tone="success">{d.learn.courseCompleted}</Alert>}
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="blue">{lesson.type}</Badge>
              <h1 className="mt-2 text-2xl font-extrabold text-navy-900 sm:text-3xl">{pick(lesson, "title", locale)}</h1>
            </div>
            {complete && <Badge tone="success" className="py-1 text-sm"><CheckCircle2 className="size-4" aria-hidden />{d.learn.completed}</Badge>}
          </header>

          {lesson.type === "video" && lesson.video_url && (
            <VideoLesson lessonId={lesson.id} src={lesson.video_url} initialPercent={prog?.video_percent ?? 0} startAt={prog?.last_position_seconds ?? 0} trackable={!!enrolled} />
          )}
          <Card className="p-6"><Markdown source={pick(lesson, "body", locale)} /></Card>

          {lesson.type === "quiz" && lesson.assessment_id && <ButtonLink href={p(`/quiz/${lesson.assessment_id}`)} size="lg">{d.learn.startQuiz}{arrowE}</ButtonLink>}
          {lesson.type === "assignment" && lesson.assignment_id && <ButtonLink href={p(`/assignment/${lesson.assignment_id}`)} size="lg">{d.learn.openAssignment}{arrowE}</ButtonLink>}
          {lab && (
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/${locale}/labs/${lab.slug}`} size="lg">{d.learn.openLab}{arrowE}</ButtonLink>
              {lab.launch_url && <a href={lab.launch_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl px-5 font-semibold text-royal-700 ring-1 ring-line">{pick(lab, "title", locale)}<ExternalLink className="size-4" aria-hidden /></a>}
            </div>
          )}

          {(resources ?? []).length > 0 && (
            <Card className="p-5"><h2 className="font-bold text-navy-900">{d.learn.resources}</h2>
              <ul className="mt-3 space-y-2 text-sm">{(resources ?? []).map((r) => <li key={r.id}><a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-royal-600"><FileDown className="size-4" aria-hidden />{r.title}</a></li>)}</ul>
            </Card>
          )}

          <div className="flex flex-col gap-3 rounded-2xl bg-paper p-4 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted">{!complete && ruleHelp}</div>
            <div className="flex flex-wrap gap-2">
              {prev && <ButtonLink href={p(`/${prev.id}`)} variant="secondary">{arrowS}{d.learn.prevLesson}</ButtonLink>}
              {canSelfComplete && (
                <ActionForm action={completeLessonAction}>
                  <input type="hidden" name="lesson_id" value={lesson.id} />
                  {next && <input type="hidden" name="next" value={p(`/${next.id}`)} />}
                  <SubmitButton pendingLabel={d.common.saving}>{d.learn.markComplete}</SubmitButton>
                </ActionForm>
              )}
              {next && <ButtonLink href={p(`/${next.id}`)} variant={complete ? "primary" : "secondary"}>{d.learn.nextLesson}{arrowE}</ButtonLink>}
            </div>
          </div>

          {enrolled && (
            <div className="wt-stagger grid gap-6 xl:grid-cols-2">
              <Card className="p-5">
                <h2 className="font-bold text-navy-900">{d.learn.notes}</h2>
                <ActionForm action={saveNoteAction} resetOnSuccess className="mt-3 space-y-2">
                  <input type="hidden" name="lesson_id" value={lesson.id} />
                  <label htmlFor="note-body" className="sr-only">{d.learn.notes}</label>
                  <Textarea id="note-body" name="body" placeholder={d.learn.notePlaceholder} maxLength={5000} />
                  <FieldError name="body" />
                  <SubmitButton size="sm" pendingLabel={d.common.saving}>{d.learn.addNote}</SubmitButton>
                </ActionForm>
                <ul className="mt-4 space-y-2">
                  {(notes ?? []).map((n) => (
                    <li key={n.id} className="rounded-xl bg-surface p-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.body}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-subtle">
                        <span>{formatDateTime(n.created_at, locale)}</span>
                        <ActionForm action={deleteNoteAction}><input type="hidden" name="note_id" value={n.id} /><button type="submit" className="font-semibold text-danger">{d.common.delete}</button></ActionForm>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
              <AssistantPanel courseId={ctx.course.id} lessonId={lesson.id} />
            </div>
          )}
        </article>
      </div>
    </Container>
  );
}
