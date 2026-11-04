import Link from "next/link";
import { formatDate, pick } from "@/lib/i18n/config";
import { Badge, Card, DemoBadge, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Select } from "@/components/ui/form";
import { AreaField, SelectField, TextField, toLocalInput } from "@/features/admin/fields";
import { AdminTitle, adminPage, toneFor } from "@/features/admin/page-kit";
import * as A from "@/features/admin/actions";

const STATUS = ["draft", "open", "closed", "completed", "archived"] as const;
type Comp = { id: string; slug: string; title_en: string; title_ar: string; description_en: string | null; description_ar: string | null; eligibility_en: string | null; eligibility_ar: string | null; team_min: number; team_max: number; registration_deadline: string | null; event_date: string | null; status: string; cover_url: string | null; is_test_data: boolean };

export default async function AdminCompetitions({ params, searchParams }: PageProps<"/[locale]/admin/competitions">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const sp = await searchParams;
  const [{ data: comps }, { data: teams }] = await Promise.all([
    supabase.from("competitions").select("*").order("created_at", { ascending: false }),
    supabase.from("competition_teams").select("id, name, members, status, created_at, competitions(title_en, title_ar), profiles:captain_id(full_name)").order("created_at", { ascending: false }).limit(100),
  ]);
  const list = (comps ?? []) as Comp[];
  const editing = typeof sp.edit === "string" ? list.find((c) => c.id === sp.edit) : undefined;
  const teamRows = (teams ?? []) as unknown as { id: string; name: string; members: unknown; status: string; competitions: { title_en: string; title_ar: string } | null; profiles: { full_name: string } | null }[];
  return (
    <div className="space-y-6">
      <AdminTitle title={a.competitions} />
      <Table head={[d.common.name, a.deadline, d.common.status, d.common.actions]}>
        {list.map((c) => (
          <tr key={c.id}>
            <Td className="font-semibold">{pick(c, "title", locale)} <DemoBadge show={c.is_test_data} label={d.common.demoBadge} /></Td>
            <Td>{c.registration_deadline ? formatDate(c.registration_deadline, locale) : "—"}</Td>
            <Td><Badge tone={toneFor(c.status)}>{c.status}</Badge></Td>
            <Td><Link className="text-sm font-semibold text-royal-600" href={`/${locale}/admin/competitions?edit=${c.id}`}>{a.editItem}</Link></Td>
          </tr>
        ))}
      </Table>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">{editing ? `${a.editItem}: ${pick(editing, "title", locale)}` : a.newItem}</h2>
        <ActionForm key={editing?.id ?? "new"} action={A.saveCompetitionAction} className="grid gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <TextField name="title_en" label={a.titleEn} defaultValue={editing?.title_en} required dir="ltr" />
          <TextField name="title_ar" label={a.titleAr} defaultValue={editing?.title_ar} required dir="rtl" />
          <TextField name="slug" label={a.slug} defaultValue={editing?.slug} required dir="ltr" />
          <SelectField name="status" label={d.common.status} defaultValue={editing?.status ?? "draft"} options={STATUS.map((s) => [s, s])} />
          <AreaField name="description_en" label={a.descriptionEn} defaultValue={editing?.description_en} dir="ltr" />
          <AreaField name="description_ar" label={a.descriptionAr} defaultValue={editing?.description_ar} dir="rtl" />
          <AreaField name="eligibility_en" label={a.eligibilityEn} defaultValue={editing?.eligibility_en} rows={3} dir="ltr" />
          <AreaField name="eligibility_ar" label={a.eligibilityAr} defaultValue={editing?.eligibility_ar} rows={3} dir="rtl" />
          <TextField name="team_min" label={a.teamMin} type="number" defaultValue={editing?.team_min ?? 1} />
          <TextField name="team_max" label={a.teamMax} type="number" defaultValue={editing?.team_max ?? 4} />
          <TextField name="registration_deadline" label={a.deadline} type="datetime-local" defaultValue={toLocalInput(editing?.registration_deadline)} />
          <TextField name="event_date" label={a.eventDate} type="date" defaultValue={editing?.event_date ?? ""} />
          <TextField name="cover_url" label={a.coverUrl} defaultValue={editing?.cover_url} dir="ltr" className="md:col-span-2" />
          <div className="md:col-span-2"><SubmitButton pendingLabel={d.common.saving}>{d.common.save}</SubmitButton></div>
        </ActionForm>
      </Card>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{a.teams}</h2>
        <Table head={[d.common.name, a.competitions, a.members, d.common.status]}>
          {teamRows.map((t) => (
            <tr key={t.id}>
              <Td className="font-semibold">{t.name}<div className="text-xs text-subtle">{t.profiles?.full_name}</div></Td>
              <Td>{t.competitions ? pick(t.competitions, "title", locale) : "—"}</Td>
              <Td className="text-xs">{Array.isArray(t.members) ? t.members.length : 0}</Td>
              <Td>
                <ActionForm action={A.setTeamStatusAction} className="flex gap-1">
                  <input type="hidden" name="id" value={t.id} />
                  <Select name="status" defaultValue={t.status} className="h-9 w-36" aria-label={d.common.status}>{["submitted", "accepted", "rejected", "withdrawn"].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
                  <SubmitButton size="sm" variant="secondary">{d.common.save}</SubmitButton>
                </ActionForm>
              </Td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}
