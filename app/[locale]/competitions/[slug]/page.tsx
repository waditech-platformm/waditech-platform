import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Badge, Card, Container, DemoBadge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, SubmitButton, FieldError } from "@/components/ui/action-form";
import { Input, Label, Textarea } from "@/components/ui/form";
import { getCompetition } from "@/features/content/queries";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { registerTeamAction, withdrawTeamAction } from "@/features/engagement/actions";

export default async function CompetitionPage({ params }: PageProps<"/[locale]/competitions/[slug]">) {
  const { locale: l, slug } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const c = await getCompetition(slug);
  if (!c || c.status === "draft") notFound();
  const viewer = await getViewer();
  const teams = viewer ? ((await (await createClient()).from("competition_teams").select("id, name, status, members, created_at").eq("competition_id", c.id).eq("captain_id", viewer.id)).data ?? []) : [];
  const open = c.status === "open" && (!c.registration_deadline || new Date(c.registration_deadline) > new Date());
  return (
    <Container className="max-w-4xl py-10">
      <Link href={`/${locale}/competitions`} className="text-sm font-semibold text-royal-600">← {d.competitions.title}</Link>
      {c.cover_url && <div className="relative mt-4 aspect-[16/7] overflow-hidden rounded-3xl"><Image src={c.cover_url} alt="" fill priority sizes="900px" className="object-cover" /></div>}
      <div className="mt-6 flex gap-2"><Badge tone={c.status === "open" ? "success" : "neutral"}>{d.competitions.compStatus[c.status as keyof typeof d.competitions.compStatus]}</Badge><DemoBadge show={c.is_test_data} label={d.common.demoBadge} /></div>
      <h1 className="mt-2 text-3xl font-extrabold text-navy-900">{pick(c, "title", locale)}</h1>
      <p className="mt-3 text-muted">{pick(c, "description", locale)}</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><dt className="text-xs text-subtle">{d.competitions.deadline}</dt><dd className="font-bold">{c.registration_deadline ? formatDate(c.registration_deadline, locale) : "—"}</dd></Card>
        <Card className="p-4"><dt className="text-xs text-subtle">{d.competitions.eventDate}</dt><dd className="font-bold">{c.event_date ? formatDate(c.event_date, locale) : "—"}</dd></Card>
        <Card className="p-4"><dt className="text-xs text-subtle">{d.competitions.teamSize}</dt><dd className="font-bold">{c.team_min}–{c.team_max}</dd></Card>
      </dl>
      {pick(c, "eligibility", locale) && <Card className="mt-4 p-5"><p className="text-sm font-bold text-navy-900">{d.competitions.eligibility}</p><p className="mt-1 text-sm text-muted">{pick(c, "eligibility", locale)}</p></Card>}
      {teams.length > 0 && (
        <Card className="mt-6 p-5"><h2 className="font-bold text-navy-900">{d.competitions.myTeams}</h2>
          <ul className="mt-3 divide-y divide-line">{teams.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3 text-sm"><span className="font-semibold">{t.name} <span className="font-normal text-subtle">({(t.members as unknown[]).length})</span></span>
              <span className="flex items-center gap-2"><Badge tone={t.status === "accepted" ? "success" : t.status === "rejected" ? "danger" : "blue"}>{d.competitions.status[t.status as keyof typeof d.competitions.status]}</Badge>
                {t.status === "submitted" && <ActionForm action={withdrawTeamAction}><input type="hidden" name="team_id" value={t.id} /><button className="text-xs font-semibold text-danger" type="submit">{d.competitions.withdraw}</button></ActionForm>}</span></li>
          ))}</ul></Card>
      )}
      <Card className="mt-6 p-6">
        <h2 className="font-bold text-navy-900">{d.competitions.register}</h2>
        {!open ? <p className="mt-2 text-sm text-muted">{d.events.closed}</p> : !viewer ? <ButtonLink className="mt-4" href={`/${locale}/login?next=/${locale}/competitions/${c.slug}`}>{d.common.signInToContinue}</ButtonLink> : (
          <ActionForm action={registerTeamAction} resetOnSuccess className="mt-4 space-y-4">
            <input type="hidden" name="competition_id" value={c.id} />
            <div><Label htmlFor="name">{d.competitions.teamName}</Label><Input id="name" name="name" required maxLength={80} /><FieldError name="name" /></div>
            <div><Label htmlFor="members">{d.competitions.members}</Label><Textarea id="members" name="members" required placeholder={locale === "ar" ? "سارة، 14\nعمر، 15" : "Sara, 14\nOmar, 15"} /><FieldError name="members" /></div>
            <div><Label htmlFor="project_summary">{d.competitions.summary}</Label><Textarea id="project_summary" name="project_summary" maxLength={3000} /></div>
            <SubmitButton pendingLabel={d.common.saving}>{d.common.submit}</SubmitButton>
          </ActionForm>
        )}
      </Card>
    </Container>
  );
}
