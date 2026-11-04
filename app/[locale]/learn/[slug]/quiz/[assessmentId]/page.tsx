import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Alert, Badge, Card, Container } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { QuizForm, type StudentQuestion } from "@/features/learning/ui/quiz-form";
import { startAttemptAction } from "@/features/learning/actions";

export default async function QuizPage({ params }: PageProps<"/[locale]/learn/[slug]/quiz/[assessmentId]">) {
  const { locale: l, slug, assessmentId } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const viewer = await requireViewer(locale, "learn");
  const supabase = await createClient();
  const { data: a } = await supabase.rpc("assessment_for_student", { p_assessment: assessmentId });
  if (!a) notFound();
  const quiz = a as { id: string; title_en: string; title_ar: string; description_en: string | null; description_ar: string | null; pass_percent: number; max_attempts: number | null; time_limit_minutes: number | null; questions: StudentQuestion[] };
  const { data: attempts } = await supabase.from("assessment_attempts").select("id, attempt_number, status, score_percent, passed, submitted_at, feedback").eq("assessment_id", assessmentId).eq("student_id", viewer.id).order("attempt_number", { ascending: false });
  const list = attempts ?? [];
  const open = list.find((t) => t.status === "in_progress");
  const used = list.length;
  const left = quiz.max_attempts ? quiz.max_attempts - used : Infinity;
  const { data: lesson } = await supabase.from("lessons").select("id").eq("assessment_id", assessmentId).maybeSingle();
  return (
    <Container className="max-w-3xl py-10">
      {lesson && <Link href={`/${locale}/learn/${slug}/${lesson.id}`} className="text-sm font-semibold text-royal-600">← {d.quiz.backToLesson}</Link>}
      <h1 className="mt-3 text-3xl font-extrabold text-navy-900">{pick(quiz, "title", locale)}</h1>
      <p className="mt-2 text-muted">{pick(quiz, "description", locale)}</p>
      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <Card className="p-3"><dt className="text-subtle">{d.quiz.passMark}</dt><dd className="font-bold">{quiz.pass_percent}%</dd></Card>
        <Card className="p-3"><dt className="text-subtle">{d.quiz.attempts}</dt><dd className="font-bold">{used} / {quiz.max_attempts ?? d.quiz.unlimited}</dd></Card>
        <Card className="p-3"><dt className="text-subtle">{d.quiz.timeLimit}</dt><dd className="font-bold">{quiz.time_limit_minutes ? `${quiz.time_limit_minutes} ${d.common.minutes}` : "—"}</dd></Card>
      </dl>
      <div className="mt-8">
        {open ? <QuizForm attemptId={open.id} questions={quiz.questions} />
          : left > 0 ? (
            <ActionForm action={startAttemptAction}><input type="hidden" name="assessment_id" value={quiz.id} /><SubmitButton size="lg" pendingLabel={d.common.loading}>{d.quiz.start}</SubmitButton></ActionForm>
          ) : <Alert tone="warning">{d.quiz.noAttemptsLeft}</Alert>}
      </div>
      {list.filter((t) => t.status !== "in_progress").length > 0 && (
        <section className="mt-10">
          <h2 className="font-bold text-navy-900">{d.quiz.history}</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
            {list.filter((t) => t.status !== "in_progress").map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <span>#{t.attempt_number} · {t.submitted_at && formatDateTime(t.submitted_at, locale)}{t.feedback && <span className="block text-xs text-subtle">{t.feedback}</span>}</span>
                <Badge tone={t.status === "needs_review" ? "warning" : t.passed ? "success" : "danger"}>{t.status === "needs_review" ? d.dashboard.inReview : `${Math.round(Number(t.score_percent))}% · ${t.passed ? d.dashboard.passed : d.dashboard.notPassed}`}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
