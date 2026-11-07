import Link from "next/link";
import { pick } from "@/lib/i18n/config";
import { Badge, Card, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { AreaField, SelectField, TextField } from "@/features/admin/fields";
import { AdminTitle, adminPage, toneFor } from "@/features/admin/page-kit";
import { saveResourceAction } from "@/features/admin/actions";

const CATS = ["robotics", "ai", "programming", "cybersecurity", "electronics", "embedded", "iot", "drones", "3d_printing", "stem"] as const;
type R = { id: string; title_en: string; title_ar: string; description_en: string | null; description_ar: string | null; kind: string; url: string; category: string | null; grade_min: number | null; grade_max: number | null; course_id: string | null; access: string; status: string; position: number };

export default async function AdminLibrary({ params, searchParams }: PageProps<"/[locale]/admin/library">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const c = d.community;
  const sp = await searchParams;
  const [{ data }, { data: courses }] = await Promise.all([
    supabase.from("resources").select("*").order("position").order("title_en"),
    supabase.from("courses").select("id, title_en, title_ar").order("title_en"),
  ]);
  const list = (data ?? []) as R[];
  const editing = typeof sp.edit === "string" ? list.find((x) => x.id === sp.edit) : undefined;
  const kinds = c.kinds as Record<string, string>;
  const access = c.access as Record<string, string>;
  const cats = d.enums.category as Record<string, string>;
  return (
    <div className="space-y-6">
      <AdminTitle title={a.library} subtitle={c.librarySubtitle} />
      <Table head={[d.common.name, c.kind, a.access, d.common.status, d.common.actions]}>
        {list.map((r) => (
          <tr key={r.id}>
            <Td className="font-semibold">{pick(r, "title", locale)}</Td>
            <Td>{kinds[r.kind]}</Td>
            <Td className="text-xs">{access[r.access]}</Td>
            <Td><Badge tone={toneFor(r.status)}>{r.status}</Badge></Td>
            <Td><Link className="text-sm font-semibold text-royal-600" href={`/${locale}/admin/library?edit=${r.id}`}>{a.editItem}</Link></Td>
          </tr>
        ))}
      </Table>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">{editing ? `${a.editItem}: ${pick(editing, "title", locale)}` : a.newItem}</h2>
        <ActionForm key={editing?.id ?? "new"} action={saveResourceAction} refreshOnSuccess className="grid gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <TextField name="title_en" label={a.titleEn} defaultValue={editing?.title_en} required dir="ltr" />
          <TextField name="title_ar" label={a.titleAr} defaultValue={editing?.title_ar} required dir="rtl" />
          <AreaField name="description_en" label={a.summaryEn} defaultValue={editing?.description_en} rows={2} dir="ltr" />
          <AreaField name="description_ar" label={a.summaryAr} defaultValue={editing?.description_ar} rows={2} dir="rtl" />
          <SelectField name="kind" label={c.kind} defaultValue={editing?.kind ?? "pdf"} options={Object.entries(kinds)} />
          <TextField name="url" label="URL" defaultValue={editing?.url} required dir="ltr" placeholder="https://… or /media/…" />
          <SelectField name="category" label={a.category} defaultValue={editing?.category ?? ""} options={[["", "-"], ...CATS.map((x) => [x, cats[x]] as [string, string])]} />
          <SelectField name="course_id" label={a.course} defaultValue={editing?.course_id ?? ""} options={[["", "-"], ...(courses ?? []).map((x) => [x.id, pick(x, "title", locale)] as [string, string])]} />
          <TextField name="grade_min" label={a.gradeMin} type="number" min={1} max={12} defaultValue={editing?.grade_min} />
          <TextField name="grade_max" label={a.gradeMax} type="number" min={1} max={12} defaultValue={editing?.grade_max} />
          <SelectField name="access" label={a.access} defaultValue={editing?.access ?? "public"} options={Object.entries(access)} />
          <SelectField name="status" label={d.common.status} defaultValue={editing?.status ?? "draft"} options={["draft", "published", "archived"].map((s) => [s, s])} />
          <TextField name="position" label="#" type="number" min={0} defaultValue={editing?.position ?? 0} />
          <div className="md:col-span-2"><SubmitButton pendingLabel={d.common.saving}>{d.common.save}</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
