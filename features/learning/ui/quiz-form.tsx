"use client";
import { useActionState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { SubmitButton } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/primitives";
import { pick } from "@/lib/i18n/config";
import { submitAttemptAction } from "../actions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export type StudentQuestion = { id: string; kind: "single_choice" | "multiple_choice" | "short_answer"; prompt_en: string; prompt_ar: string; points: number; options: { id: string; label_en: string; label_ar: string }[] };

export function QuizForm({ attemptId, questions }: { attemptId: string; questions: StudentQuestion[] }) {
  const { dict: d, locale } = useI18n();
  const [state, action] = useActionState(submitAttemptAction, null);
  const router = useRouter();
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  if (state?.ok) {
    const s = state.data as { score: number; passed: boolean | null; status: string };
    return (
      <Alert tone={s.status === "needs_review" ? "info" : s.passed ? "success" : "warning"} title={`${d.quiz.yourScore}: ${Math.round(s.score)}%`}>
        {s.status === "needs_review" ? d.quiz.needsReview : s.passed ? d.quiz.passed : d.quiz.failed}
      </Alert>
    );
  }
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(d.quiz.confirmSubmit)) e.preventDefault(); }} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="attempt_id" value={attemptId} />
      {questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <input type="hidden" name="question_ids" value={q.id} />
          <legend className="sr-only">{i + 1}</legend>
          <p className="font-semibold text-navy-900"><span className="me-2 text-royal-600">{i + 1}.</span>{pick(q, "prompt", locale)} <span className="text-xs font-normal text-subtle">({q.points} {d.quiz.points})</span></p>
          <p className="mt-1 text-xs text-subtle">{q.kind === "single_choice" ? d.quiz.chooseOne : q.kind === "multiple_choice" ? d.quiz.chooseMany : d.quiz.typeAnswer}</p>
          {q.kind === "short_answer" ? (
            <input name={`t_${q.id}`} maxLength={4000} aria-label={pick(q, "prompt", locale)} className="mt-3 h-11 w-full rounded-xl border border-line px-3 text-sm focus:border-royal-500 focus:outline-none focus:ring-4 focus:ring-royal-100" dir="auto" />
          ) : (
            <div className="mt-3 grid gap-2">
              {q.options.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm ring-1 ring-line has-[:checked]:bg-royal-50 has-[:checked]:ring-royal-500">
                  <input type={q.kind === "single_choice" ? "radio" : "checkbox"} name={`q_${q.id}`} value={o.id} className="size-4 accent-royal-600" />
                  {pick(o, "label", locale)}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <SubmitButton size="lg" pendingLabel={d.quiz.submitting}>{d.quiz.submit}</SubmitButton>
    </form>
  );
}
