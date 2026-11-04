import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Textarea } from "@/components/ui/form";
import { labFeedbackAction } from "@/features/trainer/actions";
import { trainerNav } from "../nav";
export default async function TrainerLabs({ params }: PageProps<"/[locale]/trainer/labs">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireViewer(locale, "trainer");
  const { data } = await (await createClient()).from("lab_submissions").select("id, project_url, notes, status, feedback, created_at, labs(title_en, title_ar), profiles:student_id(full_name)").order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as unknown as { id: string; project_url: string; notes: string | null; status: string; feedback: string | null; created_at: string; labs: { title_en: string; title_ar: string }; profiles: { full_name: string } | null }[];
  return (
    <PortalShell title={d.trainer.labSubmissions} nav={trainerNav(locale, d)}>
      {rows.length === 0 ? <EmptyState title={d.common.emptyTitle} /> : <div className="space-y-4">{rows.map((s) => (
        <Card key={s.id} className="grid gap-4 p-5 md:grid-cols-[1fr_320px]">
          <div><p className="text-xs text-subtle">{s.profiles?.full_name} · {formatDateTime(s.created_at, locale)}</p><p className="font-bold text-navy-900">{pick(s.labs, "title", locale)} <Badge tone={s.status === "reviewed" ? "success" : "blue"}>{s.status}</Badge></p>
            <a href={s.project_url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-sm text-royal-600" dir="ltr">{s.project_url}</a>{s.notes && <p className="mt-2 text-sm text-muted">{s.notes}</p>}</div>
          <ActionForm action={labFeedbackAction} className="space-y-2"><input type="hidden" name="id" value={s.id} /><Textarea name="feedback" defaultValue={s.feedback ?? ""} aria-label={d.labs.feedback} /><SubmitButton size="sm">{d.common.save}</SubmitButton></ActionForm>
        </Card>
      ))}</div>}
    </PortalShell>
  );
}
