import Link from "next/link";
import { formatDate, pick } from "@/lib/i18n/config";
import { Badge, Card, DemoBadge, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { AreaField, SelectField, TextField, toLocalInput } from "@/features/admin/fields";
import { AdminTitle, adminPage, toneFor } from "@/features/admin/page-kit";
import * as A from "@/features/admin/actions";

type Sch = { id: string; slug: string; title_en: string; title_ar: string; description_en: string | null; description_ar: string | null; criteria_en: string | null; criteria_ar: string | null; coverage_percent: number; course_id: string | null; deadline: string | null; status: string; is_test_data: boolean };

export default async function AdminScholarships({ params, searchParams }: PageProps<"/[locale]/admin/scholarships">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const sp = await searchParams;
  const [{ data: rows }, { data: apps }, { data: courses }] = await Promise.all([
    supabase.from("scholarships").select("*").order("created_at", { ascending: false }),
    supabase.from("scholarship_applications").select("id, student_name, statement, status, decision_note, created_at, scholarships(title_en, title_ar)").order("created_at", { ascending: false }).limit(100),
    supabase.from("courses").select("id, title_en").order("title_en"),
  ]);
  const list = (rows ?? []) as Sch[];
  const editing = typeof sp.edit === "string" ? list.find((c) => c.id === sp.edit) : undefined;
  const appRows = (apps ?? []) as unknown as { id: string; student_name: string | null; statement: string; status: string; decision_note: string | null; created_at: string; scholarships: { title_en: string; title_ar: string } | null }[];
  return (
    <div className="space-y-6">
      <AdminTitle title={a.scholarships} />
      <Table head={[d.common.name, a.coverage, a.deadline, d.common.status, d.common.actions]}>
        {list.map((s) => (
          <tr key={s.id}>
            <Td className="font-semibold">{pick(s, "title", locale)} <DemoBadge show={s.is_test_data} label={d.common.demoBadge} /></Td>
            <Td>{s.coverage_percent}%</Td>
            <Td>{s.deadline ? formatDate(s.deadline, locale) : "—"}</Td>
            <Td><Badge tone={toneFor(s.status)}>{s.status}</Badge></Td>
            <Td><Link className="text-sm font-semibold text-royal-600" href={`/${locale}/admin/scholarships?edit=${s.id}`}>{a.editItem}</Link></Td>
          </tr>
        ))}
      </Table>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">{editing ? `${a.editItem}: ${pick(editing, "title", locale)}` : a.newItem}</h2>
        <ActionForm key={editing?.id ?? "new"} action={A.saveScholarshipAction} className="grid gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <TextField name="title_en" label={a.titleEn} defaultValue={editing?.title_en} required dir="ltr" />
          <TextField name="title_ar" label={a.titleAr} defaultValue={editing?.title_ar} required dir="rtl" />
          <TextField name="slug" label={a.slug} defaultValue={editing?.slug} required dir="ltr" />
          <SelectField name="status" label={d.common.status} defaultValue={editing?.status ?? "draft"} options={["draft", "open", "closed", "archived"].map((s) => [s, s])} />
          <AreaField name="description_en" label={a.descriptionEn} defaultValue={editing?.description_en} dir="ltr" />
          <AreaField name="description_ar" label={a.descriptionAr} defaultValue={editing?.description_ar} dir="rtl" />
          <AreaField name="criteria_en" label={a.criteriaEn} defaultValue={editing?.criteria_en} rows={3} dir="ltr" />
          <AreaField name="criteria_ar" label={a.criteriaAr} defaultValue={editing?.criteria_ar} rows={3} dir="rtl" />
          <TextField name="coverage_percent" label={a.coverage} type="number" defaultValue={editing?.coverage_percent ?? 100} />
          <TextField name="deadline" label={a.deadline} type="datetime-local" defaultValue={toLocalInput(editing?.deadline)} />
          <SelectField name="course_id" label={d.nav.programs} defaultValue={editing?.course_id ?? ""} options={[["", "—"], ...(courses ?? []).map((c) => [c.id, c.title_en] as [string, string])]} />
          <div className="flex items-end"><SubmitButton pendingLabel={d.common.saving}>{d.common.save}</SubmitButton></div>
        </ActionForm>
      </Card>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{a.applications}</h2>
        <Table head={[d.common.name, a.scholarships, d.common.date, d.common.status]}>
          {appRows.map((r) => (
            <tr key={r.id}>
              <Td className="max-w-sm"><p className="font-semibold">{r.student_name ?? "—"}</p><p className="line-clamp-3 text-xs text-muted" dir="auto">{r.statement}</p></Td>
              <Td>{r.scholarships ? pick(r.scholarships, "title", locale) : "—"}</Td>
              <Td className="text-xs">{formatDate(r.created_at, locale)}</Td>
              <Td>
                <ActionForm action={A.reviewScholarshipAppAction} className="flex flex-wrap gap-1">
                  <input type="hidden" name="id" value={r.id} />
                  <Select name="status" defaultValue={r.status === "submitted" ? "under_review" : r.status} className="h-9 w-36" aria-label={d.common.status}>{["under_review", "approved", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
                  <Input name="decision_note" defaultValue={r.decision_note ?? ""} placeholder={a.decisionNote} aria-label={a.decisionNote} className="h-9 w-48" />
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
