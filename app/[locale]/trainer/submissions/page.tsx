import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Input, Label, Textarea } from "@/components/ui/form";
import { gradeSubmissionAction, reviewAttemptAction } from "@/features/trainer/actions";
import { trainerNav } from "../nav";

export default async function TrainerSubmissions({ params }: PageProps<"/[locale]/trainer/submissions">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireViewer(locale, "trainer");
  const supabase = await createClient();
  // RLS limits these to courses the trainer teaches (or everything for admins)
  const [{ data: subs }, { data: attempts }] = await Promise.all([
    supabase.from("submissions").select("id, body_text, link_url, submitted_at, assignments(title_en, title_ar, max_points), profiles:student_id(full_name)").eq("status", "submitted").order("submitted_at"),
    supabase.from("assessment_attempts").select("id, submitted_at, assessments(title_en, title_ar), profiles:student_id(full_name), assessment_answers(question_id, text_answer, points_awarded, questions(prompt_en, prompt_ar, points, kind))").eq("status", "needs_review").order("submitted_at"),
  ]);
  type Sub = { id: string; body_text: string | null; link_url: string | null; submitted_at: string; assignments: { title_en: string; title_ar: string; max_points: number }; profiles: { full_name: string } | null };
  type Att = { id: string; submitted_at: string; assessments: { title_en: string; title_ar: string }; profiles: { full_name: string } | null; assessment_answers: { question_id: string; text_answer: string | null; points_awarded: number | null; questions: { prompt_en: string; prompt_ar: string; points: number; kind: string } }[] };
  return (
    <PortalShell title={d.trainer.submissions} nav={trainerNav(locale, d)}>
      <div className="space-y-4">
        {((subs ?? []) as unknown as Sub[]).map((s) => (
          <Card key={s.id} className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-xs text-subtle">{s.profiles?.full_name} · {formatDateTime(s.submitted_at, locale)}</p>
              <p className="mt-1 font-bold text-navy-900">{pick(s.assignments, "title", locale)}</p>
              {s.body_text && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm" dir="auto">{s.body_text}</p>}
              {s.link_url && <a href={s.link_url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-sm text-royal-600" dir="ltr">{s.link_url}</a>}
            </div>
            <ActionForm action={gradeSubmissionAction} className="space-y-3">
              <input type="hidden" name="id" value={s.id} />
              <div><Label htmlFor={`g-${s.id}`}>{d.trainer.points} / {s.assignments.max_points}</Label><Input id={`g-${s.id}`} name="grade_points" type="number" min={0} max={s.assignments.max_points} step="0.5" required /><FieldError name="grade_points" /></div>
              <div><Label htmlFor={`f-${s.id}`}>{d.trainer.feedback}</Label><Textarea id={`f-${s.id}`} name="feedback" /></div>
              <SubmitButton size="sm" pendingLabel={d.common.saving}>{d.trainer.saveGrade}</SubmitButton>
            </ActionForm>
          </Card>
        ))}
        {((attempts ?? []) as unknown as Att[]).map((t) => (
          <Card key={t.id} className="p-5">
            <p className="text-xs text-subtle">{t.profiles?.full_name} · {formatDateTime(t.submitted_at, locale)} · {d.trainer.quizReviews}</p>
            <p className="mt-1 font-bold text-navy-900">{pick(t.assessments, "title", locale)}</p>
            <ActionForm action={reviewAttemptAction} className="mt-3 space-y-3">
              <input type="hidden" name="attempt_id" value={t.id} />
              {t.assessment_answers.filter((a) => a.questions.kind === "short_answer" && a.points_awarded === null).map((a) => (
                <div key={a.question_id} className="grid gap-2 rounded-xl bg-surface p-3 sm:grid-cols-[1fr_120px] sm:items-end">
                  <div><p className="text-sm font-semibold">{pick(a.questions, "prompt", locale)}</p><p className="mt-1 text-sm" dir="auto">{a.text_answer || "—"}</p></div>
                  <div><Label htmlFor={`p-${t.id}-${a.question_id}`}>{d.trainer.points} / {a.questions.points}</Label><Input id={`p-${t.id}-${a.question_id}`} name={`p_${a.question_id}`} type="number" min={0} max={a.questions.points} step="0.5" required /></div>
                </div>
              ))}
              <div><Label htmlFor={`fb-${t.id}`}>{d.trainer.feedback}</Label><Textarea id={`fb-${t.id}`} name="feedback" /></div>
              <SubmitButton size="sm">{d.trainer.reviewAttempt}</SubmitButton>
            </ActionForm>
          </Card>
        ))}
        {!(subs ?? []).length && !(attempts ?? []).length && <EmptyState title={d.trainer.noSubmissions} />}
      </div>
    </PortalShell>
  );
}
