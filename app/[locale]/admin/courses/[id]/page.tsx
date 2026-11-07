import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, DemoBadge } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Select } from "@/components/ui/form";
import { CourseForm } from "@/features/admin/course-form";
import { AreaField, CheckField, SelectField, TextField, toLocalInput } from "@/features/admin/fields";
import type { Course } from "@/features/catalog/queries";
import {
  assignTrainerAction, deleteLessonAction, deleteModuleAction, deleteQuestionAction, removeTrainerAction, saveAssessmentAction,
  saveAssignmentAction, saveLessonAction, saveModuleAction, saveQuestionAction, setCourseStatusAction,
} from "@/features/admin/actions";

const LESSON_TYPES = ["text", "video", "quiz", "assignment", "lab", "resource"] as const;
const RULES = ["view", "video_90", "quiz_pass", "assignment_submitted", "manual"] as const;

export default async function CourseEditor({ params }: PageProps<"/[locale]/admin/courses/[id]">) {
  const { locale: l, id } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale); const a = d.admin;
  const viewer = await requireViewer(locale, "trainer");
  const admin = isAdminRole(viewer.roles);
  const supabase = await createClient();
  const { data: staff } = await supabase.rpc("is_course_staff", { course: id });
  if (!staff) notFound();
  const { data: course } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
  if (!course) notFound();
  const c = course as Course & { id: string };
  const [{ data: programs }, { data: modules }, { data: lessons }, { data: assessments }, { data: assignments }, { data: labs }, { data: trainers }, trainerUsers] = await Promise.all([
    supabase.from("programs").select("id, title_en").order("position"),
    supabase.from("course_modules").select("id, title_en, title_ar, position").eq("course_id", id).order("position"),
    supabase.from("lessons").select("id, module_id, title_en, title_ar, type, body_en, body_ar, video_url, duration_minutes, position, is_preview, completion_rule, assessment_id, assignment_id, lab_id").eq("course_id", id).order("position"),
    supabase.from("assessments").select("id, title_en, title_ar, pass_percent, max_attempts, questions(id, kind, prompt_en, prompt_ar, points, position, answer_options(id, label_en, position), question_keys(correct_option_ids, accepted_answers))").eq("course_id", id),
    supabase.from("assignments").select("id, title_en, title_ar, due_at, max_points").eq("course_id", id),
    supabase.from("labs").select("id, title_en").order("position"),
    supabase.from("course_instructors").select("trainer_id, is_lead, profiles:trainer_id(full_name)").eq("course_id", id),
    admin ? supabase.rpc("admin_list_users", { p_role: "trainer", p_limit: 200 }) : Promise.resolve({ data: [] }),
  ]);
  type Q = { id: string; kind: string; prompt_en: string; points: number; position: number; answer_options: { id: string; label_en: string; position: number }[]; question_keys: { correct_option_ids: string[]; accepted_answers: string[] } | null };
  const asOpts: [string, string][] = [["", "-"], ...(assessments ?? []).map((x) => [x.id, x.title_en] as [string, string])];
  const agOpts: [string, string][] = [["", "-"], ...(assignments ?? []).map((x) => [x.id, x.title_en] as [string, string])];
  const labOpts: [string, string][] = [["", "-"], ...(labs ?? []).map((x) => [x.id, x.title_en] as [string, string])];
  const lessonFields = (m: { id: string }, ls?: NonNullable<typeof lessons>[number]) => (
    <>
      {ls && <input type="hidden" name="id" value={ls.id} />}
      <input type="hidden" name="module_id" value={m.id} /><input type="hidden" name="course_id" value={id} />
      <TextField name="title_en" label={a.titleEn} defaultValue={ls?.title_en} required dir="ltr" />
      <TextField name="title_ar" label={a.titleAr} defaultValue={ls?.title_ar} required dir="rtl" />
      <SelectField name="type" label={a.lessonType} defaultValue={ls?.type ?? "text"} options={LESSON_TYPES.map((t) => [t, t])} />
      <SelectField name="completion_rule" label={a.completionRule} defaultValue={ls?.completion_rule ?? "view"} options={RULES.map((t) => [t, t])} />
      <AreaField name="body_en" label={a.bodyEn} defaultValue={ls?.body_en} dir="ltr" rows={4} />
      <AreaField name="body_ar" label={a.bodyAr} defaultValue={ls?.body_ar} dir="rtl" rows={4} />
      <TextField name="video_url" label={a.videoUrl} defaultValue={ls?.video_url} dir="ltr" placeholder="/media/videos/clip-1.mp4" />
      <div className="grid grid-cols-2 gap-3"><TextField name="duration_minutes" label={d.common.minutes} type="number" defaultValue={ls?.duration_minutes} /><TextField name="position" label={a.position} type="number" defaultValue={ls?.position ?? 0} /></div>
      <SelectField name="assessment_id" label={a.assessments} defaultValue={ls?.assessment_id} options={asOpts} />
      <SelectField name="assignment_id" label={d.dashboard.assignments} defaultValue={ls?.assignment_id} options={agOpts} />
      <SelectField name="lab_id" label={a.labs} defaultValue={ls?.lab_id} options={labOpts} />
      <CheckField name="is_preview" label={a.isPreview} defaultChecked={ls?.is_preview} className="self-end" />
    </>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/${locale}/admin/courses`} className="text-sm font-semibold text-royal-600">← {a.courses}</Link>
          <h1 className="mt-2 text-2xl font-extrabold text-navy-900">{pick(c, "title", locale)}</h1>
          <div className="mt-1 flex gap-2"><Badge tone={c.status === "published" ? "success" : "warning"}>{c.status}</Badge><DemoBadge show={c.is_test_data} label={d.common.demoBadge} />
            {c.status === "published" && <Link href={`/${locale}/programs/${c.slug}`} className="text-sm font-semibold text-royal-600">{d.common.preview} ↗</Link>}</div>
        </div>
        {admin && (
          <div className="flex flex-wrap gap-2">
            {(["published", "draft", "archived"] as const).filter((s) => s !== c.status).map((s) => (
              <ActionForm key={s} action={setCourseStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={s} />
                <SubmitButton size="sm" variant={s === "published" ? "primary" : "secondary"}>{s === "published" ? a.publish : s === "draft" ? a.unpublish : a.archive}</SubmitButton></ActionForm>
            ))}
          </div>
        )}
      </div>

      {admin && <Card className="p-6"><CourseForm d={d} c={c} programs={programs ?? []} /></Card>}

      {admin && (
        <Card className="p-6">
          <h2 className="font-bold text-navy-900">{a.instructors}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">{((trainers ?? []) as unknown as { trainer_id: string; is_lead: boolean; profiles: { full_name: string } }[]).map((t) => (
            <li key={t.trainer_id} className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-sm">{t.profiles?.full_name}{t.is_lead && <Badge tone="blue">lead</Badge>}
              <ActionForm action={removeTrainerAction}><input type="hidden" name="course_id" value={id} /><input type="hidden" name="trainer_id" value={t.trainer_id} /><button className="text-xs font-bold text-danger" aria-label={a.revokeRole}>×</button></ActionForm></li>
          ))}</ul>
          <ActionForm action={assignTrainerAction} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="hidden" name="course_id" value={id} />
            <label htmlFor="trainer_id" className="sr-only">{a.assignTrainer}</label>
            <Select id="trainer_id" name="trainer_id" className="w-64">{((trainerUsers.data ?? []) as { id: string; full_name: string; email: string }[]).map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}</Select>
            <CheckField name="is_lead" label="Lead" /><SubmitButton size="sm">{a.assignTrainer}</SubmitButton>
          </ActionForm>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-navy-900">{a.modules} & {a.lessons}</h2>
        <div className="space-y-4">
          {(modules ?? []).map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-navy-900">{m.position}. {pick(m, "title", locale)}</p>
                <ActionForm action={deleteModuleAction} confirmText={`${d.common.delete}?`}><input type="hidden" name="id" value={m.id} /><button className="text-xs font-semibold text-danger">{d.common.delete}</button></ActionForm>
              </div>
              <ul className="mt-3 divide-y divide-line rounded-xl ring-1 ring-line">
                {(lessons ?? []).filter((x) => x.module_id === m.id).map((ls) => (
                  <li key={ls.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm"><span><span className="text-subtle">{ls.position}.</span> {pick(ls, "title", locale)} <Badge tone="neutral">{ls.type}</Badge> <Badge tone="cyan">{ls.completion_rule}</Badge>{ls.is_preview && <Badge tone="blue">{a.isPreview}</Badge>}</span><span className="text-xs text-royal-600">{d.common.edit}</span></summary>
                      <div className="border-t border-line p-4">
                        <ActionForm action={saveLessonAction} className="grid gap-3 md:grid-cols-2">{lessonFields(m, ls)}<div className="md:col-span-2"><SubmitButton size="sm">{d.common.save}</SubmitButton></div></ActionForm>
                        <ActionForm action={deleteLessonAction} confirmText={`${d.common.delete}?`} className="mt-3"><input type="hidden" name="id" value={ls.id} /><button className="text-xs font-semibold text-danger">{d.common.delete}</button></ActionForm>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
              <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-royal-600">+ {a.addLesson}</summary>
                <ActionForm action={saveLessonAction} resetOnSuccess className="mt-3 grid gap-3 md:grid-cols-2">{lessonFields(m)}<div className="md:col-span-2"><SubmitButton size="sm">{a.addLesson}</SubmitButton></div></ActionForm>
              </details>
            </Card>
          ))}
          <Card className="p-5"><h3 className="font-semibold text-navy-900">{a.addModule}</h3>
            <ActionForm action={saveModuleAction} resetOnSuccess className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_100px_auto] md:items-end">
              <input type="hidden" name="course_id" value={id} />
              <TextField name="title_en" label={a.titleEn} required dir="ltr" /><TextField name="title_ar" label={a.titleAr} required dir="rtl" /><TextField name="position" label={a.position} type="number" defaultValue={(modules ?? []).length + 1} />
              <SubmitButton size="md">{a.addModule}</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-bold text-navy-900">{a.assessments}</h2>
          <div className="space-y-4">
            {(assessments ?? []).map((as) => (
              <Card key={as.id} className="p-5">
                <p className="font-bold text-navy-900">{pick(as, "title", locale)} <span className="text-xs font-normal text-subtle">· {d.quiz.passMark} {as.pass_percent}% · {d.quiz.attempts} {as.max_attempts ?? "∞"}</span></p>
                <ol className="mt-3 space-y-2 text-sm">{((as.questions ?? []) as unknown as Q[]).sort((x, y) => x.position - y.position).map((q) => (
                  <li key={q.id} className="rounded-xl bg-surface p-3">
                    <div className="flex justify-between gap-2"><span className="font-semibold">{q.prompt_en}</span><ActionForm action={deleteQuestionAction}><input type="hidden" name="id" value={q.id} /><button className="text-xs font-semibold text-danger">{d.common.delete}</button></ActionForm></div>
                    <ul className="mt-1 text-xs">{q.answer_options.sort((x, y) => x.position - y.position).map((o) => <li key={o.id} className={q.question_keys?.correct_option_ids.includes(o.id) ? "font-bold text-success" : "text-muted"}>{q.question_keys?.correct_option_ids.includes(o.id) ? "✓ " : "· "}{o.label_en}</li>)}</ul>
                    {q.kind === "short_answer" && <p className="text-xs text-muted">{q.question_keys?.accepted_answers.length ? `✓ ${q.question_keys.accepted_answers.join(" / ")}` : "manual review"}</p>}
                  </li>
                ))}</ol>
                <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-royal-600">+ {a.addQuestion}</summary>
                  <ActionForm action={saveQuestionAction} resetOnSuccess className="mt-3 grid gap-3">
                    <input type="hidden" name="assessment_id" value={as.id} />
                    <SelectField name="kind" label={a.lessonType} options={[["single_choice", "single_choice"], ["multiple_choice", "multiple_choice"], ["short_answer", "short_answer"]]} />
                    <TextField name="prompt_en" label={a.titleEn} required dir="ltr" /><TextField name="prompt_ar" label={a.titleAr} required dir="rtl" />
                    <AreaField name="options" label="Options: one per line: English | Arabic (prefix * for correct)" rows={4} dir="ltr" />
                    <AreaField name="accepted" label="Short answer: accepted answers, one per line (leave empty for manual review)" rows={2} dir="ltr" />
                    <div className="grid grid-cols-2 gap-3"><TextField name="points" label={d.quiz.points} type="number" defaultValue={1} /><TextField name="position" label={a.position} type="number" defaultValue={(as.questions?.length ?? 0) + 1} /></div>
                    <SubmitButton size="sm">{a.addQuestion}</SubmitButton>
                  </ActionForm>
                </details>
              </Card>
            ))}
            <Card className="p-5"><h3 className="font-semibold">{a.addAssessment}</h3>
              <ActionForm action={saveAssessmentAction} resetOnSuccess className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="course_id" value={id} />
                <TextField name="title_en" label={a.titleEn} required dir="ltr" /><TextField name="title_ar" label={a.titleAr} required dir="rtl" />
                <TextField name="pass_percent" label={d.quiz.passMark} type="number" defaultValue={60} /><TextField name="max_attempts" label={d.quiz.attempts} type="number" />
                <div className="sm:col-span-2"><SubmitButton size="sm">{a.addAssessment}</SubmitButton></div>
              </ActionForm>
            </Card>
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold text-navy-900">{d.dashboard.assignments}</h2>
          <Card className="p-5">
            <ul className="space-y-2 text-sm">{(assignments ?? []).map((x) => <li key={x.id} className="rounded-xl bg-surface p-3 font-semibold">{pick(x, "title", locale)} <span className="font-normal text-subtle">· {x.max_points} {d.quiz.points}</span></li>)}</ul>
            <ActionForm action={saveAssignmentAction} resetOnSuccess className="mt-4 grid gap-3">
              <input type="hidden" name="course_id" value={id} />
              <TextField name="title_en" label={a.titleEn} required dir="ltr" /><TextField name="title_ar" label={a.titleAr} required dir="rtl" />
              <AreaField name="instructions_en" label={d.assignment.instructions + " (EN)"} dir="ltr" rows={3} /><AreaField name="instructions_ar" label={d.assignment.instructions + " (AR)"} dir="rtl" rows={3} />
              <div className="grid grid-cols-2 gap-3"><TextField name="max_points" label={d.quiz.points} type="number" defaultValue={100} /><TextField name="due_at" label={d.dashboard.due} type="datetime-local" defaultValue={toLocalInput(null)} /></div>
              <SubmitButton size="sm">{d.common.create}</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </section>
    </div>
  );
}
