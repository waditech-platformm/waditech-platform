import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Badge, Card, Container, DemoBadge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Input, Label, Textarea } from "@/components/ui/form";
import { getScholarship } from "@/features/content/queries";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { applyScholarshipAction } from "@/features/engagement/actions";

export default async function ScholarshipPage({ params }: PageProps<"/[locale]/scholarships/[slug]">) {
  const { locale: l, slug } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const s = await getScholarship(slug);
  if (!s || s.status === "draft") notFound();
  const viewer = await getViewer();
  const app = viewer ? (await (await createClient()).from("scholarship_applications").select("status, decision_note, created_at").eq("scholarship_id", s.id).eq("applicant_id", viewer.id).maybeSingle()).data : null;
  const open = s.status === "open" && (!s.deadline || new Date(s.deadline) > new Date());
  return (
    <Container className="max-w-3xl py-10">
      <Link href={`/${locale}/scholarships`} className="text-sm font-semibold text-royal-600">← {d.scholarships.title}</Link>
      <div className="mt-4 flex gap-2"><DemoBadge show={s.is_test_data} label={d.common.demoBadge} /></div>
      <h1 className="mt-2 text-3xl font-extrabold text-navy-900">{pick(s, "title", locale)}</h1>
      <p className="mt-3 text-muted">{pick(s, "description", locale)}</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card className="p-4"><dt className="text-xs text-subtle">{d.scholarships.coverage}</dt><dd className="text-xl font-bold">{s.coverage_percent ?? "-"}%</dd></Card>
        <Card className="p-4"><dt className="text-xs text-subtle">{d.scholarships.deadline}</dt><dd className="text-xl font-bold">{s.deadline ? formatDate(s.deadline, locale) : "-"}</dd></Card>
      </dl>
      {pick(s, "criteria", locale) && <Card className="mt-4 p-5"><p className="text-sm font-bold">{d.scholarships.criteria}</p><p className="mt-1 text-sm text-muted">{pick(s, "criteria", locale)}</p></Card>}
      <Card className="mt-6 p-6">
        {app ? (
          <div><Badge tone={app.status === "approved" ? "success" : app.status === "rejected" ? "danger" : "blue"} className="text-sm">{d.scholarships.status[app.status as keyof typeof d.scholarships.status]}</Badge>{app.decision_note && <p className="mt-2 text-sm">{app.decision_note}</p>}</div>
        ) : !open ? <p className="text-sm text-muted">{d.events.closed}</p> : !viewer ? <ButtonLink href={`/${locale}/login?next=/${locale}/scholarships/${s.slug}`}>{d.common.signInToContinue}</ButtonLink> : (
          <ActionForm action={applyScholarshipAction} className="space-y-4">
            <h2 className="font-bold text-navy-900">{d.scholarships.apply}</h2>
            <input type="hidden" name="scholarship_id" value={s.id} />
            <div><Label htmlFor="student_name">{d.scholarships.studentName}</Label><Input id="student_name" name="student_name" defaultValue={viewer.roles.includes("student") ? viewer.profile.full_name : ""} required /><FieldError name="student_name" /></div>
            <div><Label htmlFor="statement">{d.scholarships.statement}</Label><Textarea id="statement" name="statement" required minLength={50} maxLength={5000} className="min-h-40" /><FieldError name="statement" /></div>
            <SubmitButton pendingLabel={d.common.saving}>{d.common.submit}</SubmitButton>
          </ActionForm>
        )}
      </Card>
    </Container>
  );
}
