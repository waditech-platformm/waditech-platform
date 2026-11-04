import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Alert, Badge, Card, Container } from "@/components/ui/primitives";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Input, Label, Textarea } from "@/components/ui/form";
import { Markdown } from "@/components/markdown";
import { submitAssignmentAction } from "@/features/learning/actions";

export default async function AssignmentPage({ params }: PageProps<"/[locale]/learn/[slug]/assignment/[assignmentId]">) {
  const { locale: l, slug, assignmentId } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const viewer = await requireViewer(locale, "learn");
  const supabase = await createClient();
  const { data: a } = await supabase.from("assignments").select("id, title_en, title_ar, instructions_en, instructions_ar, due_at, max_points").eq("id", assignmentId).maybeSingle();
  if (!a) notFound();
  const [{ data: sub }, { data: lesson }] = await Promise.all([
    supabase.from("submissions").select("body_text, link_url, status, grade_points, feedback, submitted_at, graded_at").eq("assignment_id", a.id).eq("student_id", viewer.id).maybeSingle(),
    supabase.from("lessons").select("id").eq("assignment_id", a.id).maybeSingle(),
  ]);
  const locked = sub?.status === "graded";
  return (
    <Container className="max-w-3xl py-10">
      {lesson && <Link href={`/${locale}/learn/${slug}/${lesson.id}`} className="text-sm font-semibold text-royal-600">← {d.quiz.backToLesson}</Link>}
      <h1 className="mt-3 text-3xl font-extrabold text-navy-900">{pick(a, "title", locale)}</h1>
      <p className="mt-2 text-sm text-subtle">{a.due_at && <>{d.dashboard.due}: {formatDateTime(a.due_at, locale)} · </>}{a.max_points} {d.quiz.points}</p>
      <Card className="mt-6 p-6"><h2 className="mb-3 font-bold text-navy-900">{d.assignment.instructions}</h2><Markdown source={pick(a, "instructions", locale)} /></Card>
      {sub && (
        <Card className="mt-6 p-6">
          <div className="flex items-center justify-between"><h2 className="font-bold text-navy-900">{d.assignment.yourWork}</h2><Badge tone={locked ? "success" : "blue"}>{locked ? d.assignment.graded : d.assignment.submitted}</Badge></div>
          {locked && <p className="mt-3 text-2xl font-extrabold text-navy-900">{d.assignment.grade}: {sub.grade_points} / {a.max_points}</p>}
          {sub.feedback && <div className="mt-3 rounded-xl bg-royal-50 p-4 text-sm"><p className="font-semibold">{d.assignment.feedback}</p><p className="mt-1 whitespace-pre-wrap">{sub.feedback}</p></div>}
        </Card>
      )}
      {locked ? <Alert tone="info" className="mt-6">{d.assignment.locked}</Alert> : (
        <ActionForm action={submitAssignmentAction} className="mt-6 space-y-4">
          <input type="hidden" name="assignment_id" value={a.id} />
          <div><Label htmlFor="body_text">{d.assignment.answer}</Label><Textarea id="body_text" name="body_text" defaultValue={sub?.body_text ?? ""} className="min-h-48" dir="auto" /><FieldError name="body_text" /></div>
          <div><Label htmlFor="link_url">{d.assignment.link}</Label><Input id="link_url" name="link_url" type="url" defaultValue={sub?.link_url ?? ""} dir="ltr" /><FieldError name="link_url" /></div>
          <SubmitButton size="lg" pendingLabel={d.common.saving}>{sub ? d.assignment.resubmit : d.assignment.submit}</SubmitButton>
        </ActionForm>
      )}
    </Container>
  );
}
