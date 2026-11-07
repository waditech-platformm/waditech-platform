import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Alert, Badge, Card, Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Input, Label, Textarea } from "@/components/ui/form";
import { getLab } from "@/features/content/queries";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { submitLabAction } from "@/features/learning/actions";

export default async function LabPage({ params }: PageProps<"/[locale]/labs/[slug]">) {
  const { locale: l, slug } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const lab = await getLab(slug);
  if (!lab || lab.status !== "published") notFound();
  const viewer = await getViewer();
  const subs = viewer ? (await (await createClient()).from("lab_submissions").select("id, project_url, notes, status, feedback, created_at").eq("lab_id", lab.id).eq("student_id", viewer.id).order("created_at", { ascending: false })).data ?? [] : [];
  const external = lab.provider !== "internal";
  return (
    <Container className="max-w-4xl py-10">
      <Link href={`/${locale}/labs`} className="text-sm font-semibold text-royal-600">← {d.labs.title}</Link>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-royal-600">{d.enums.labCategory[lab.category as keyof typeof d.enums.labCategory]}</p>
      <h1 className="mt-1 text-3xl font-extrabold text-navy-900">{pick(lab, "title", locale)}</h1>
      <p className="mt-2 text-muted">{pick(lab, "summary", locale)}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {lab.launch_url && <a href={lab.launch_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-action px-6 font-semibold text-white hover:bg-action-hover">{d.labs.launch}<ExternalLink className="size-4" aria-hidden /></a>}
        <Badge tone="neutral">{lab.provider}</Badge>
      </div>
      <Alert tone="info" className="mt-4">{external ? d.labs.externalNote : d.labs.internalNote}</Alert>
      <Card className="mt-6 p-6"><h2 className="font-bold text-navy-900">{d.labs.instructions}</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-ink">{pick(lab, "instructions", locale)}</p></Card>
      <Card className="mt-6 p-6">
        <h2 className="font-bold text-navy-900">{d.labs.submitWork}</h2>
        {!viewer ? <ButtonLink href={`/${locale}/login?next=/${locale}/labs/${lab.slug}`} className="mt-4">{d.common.signInToContinue}</ButtonLink> : (
          <ActionForm action={submitLabAction} resetOnSuccess className="mt-4 space-y-4">
            <input type="hidden" name="lab_id" value={lab.id} />
            <div><Label htmlFor="project_url">{d.labs.projectUrl}</Label><Input id="project_url" name="project_url" type="url" dir="ltr" required /><FieldError name="project_url" /></div>
            <div><Label htmlFor="notes">{d.labs.notes}</Label><Textarea id="notes" name="notes" maxLength={3000} /></div>
            <SubmitButton pendingLabel={d.common.saving}>{d.common.submit}</SubmitButton>
          </ActionForm>
        )}
        {subs.length > 0 && (
          <div className="mt-6 border-t border-line pt-4"><h3 className="text-sm font-bold text-navy-900">{d.labs.mySubmissions}</h3>
            <ul className="mt-2 space-y-2 text-sm">{subs.map((s) => (
              <li key={s.id} className="rounded-xl bg-surface p-3"><a href={s.project_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-royal-600 break-all" dir="ltr">{s.project_url}</a>
                <p className="text-xs text-subtle">{formatDateTime(s.created_at, locale)} · <Badge tone={s.status === "reviewed" ? "success" : "blue"}>{s.status}</Badge></p>
                {s.feedback && <p className="mt-1"><span className="font-semibold">{d.labs.feedback}:</span> {s.feedback}</p>}</li>
            ))}</ul></div>
        )}
      </Card>
    </Container>
  );
}
