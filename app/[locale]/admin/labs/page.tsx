import Link from "next/link";
import { pick } from "@/lib/i18n/config";
import { Badge, Card, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { AreaField, SelectField, TextField } from "@/features/admin/fields";
import { AdminTitle, adminPage, toneFor } from "@/features/admin/page-kit";
import * as A from "@/features/admin/actions";

const CATS = ["robotics", "electronics", "programming", "ai", "cybersecurity", "3d_design"] as const;
const PROVIDERS = ["wokwi", "tinkercad", "python_online", "teachable_machine", "internal", "external_link"] as const;
type Lab = { id: string; slug: string; category: string; title_en: string; title_ar: string; summary_en: string | null; summary_ar: string | null; instructions_en: string | null; instructions_ar: string | null; provider: string; launch_url: string | null; status: string };

export default async function AdminLabs({ params, searchParams }: PageProps<"/[locale]/admin/labs">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const sp = await searchParams;
  const { data } = await supabase.from("labs").select("*").order("position").order("title_en");
  const list = (data ?? []) as Lab[];
  const editing = typeof sp.edit === "string" ? list.find((c) => c.id === sp.edit) : undefined;
  return (
    <div className="space-y-6">
      <AdminTitle title={a.labs} />
      <Table head={[d.common.name, a.category, a.provider, d.common.status, d.common.actions]}>
        {list.map((l) => (
          <tr key={l.id}>
            <Td className="font-semibold">{pick(l, "title", locale)}</Td>
            <Td>{l.category}</Td>
            <Td className="text-xs">{l.provider}</Td>
            <Td><Badge tone={toneFor(l.status)}>{l.status}</Badge></Td>
            <Td><Link className="text-sm font-semibold text-royal-600" href={`/${locale}/admin/labs?edit=${l.id}`}>{a.editItem}</Link></Td>
          </tr>
        ))}
      </Table>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">{editing ? `${a.editItem}: ${pick(editing, "title", locale)}` : a.newItem}</h2>
        <ActionForm key={editing?.id ?? "new"} action={A.saveLabAction} className="grid gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <TextField name="title_en" label={a.titleEn} defaultValue={editing?.title_en} required dir="ltr" />
          <TextField name="title_ar" label={a.titleAr} defaultValue={editing?.title_ar} required dir="rtl" />
          <TextField name="slug" label={a.slug} defaultValue={editing?.slug} required dir="ltr" />
          <SelectField name="category" label={a.category} defaultValue={editing?.category ?? "robotics"} options={CATS.map((c) => [c, c])} />
          <SelectField name="provider" label={a.provider} defaultValue={editing?.provider ?? "external_link"} options={PROVIDERS.map((p) => [p, p])} />
          <SelectField name="status" label={d.common.status} defaultValue={editing?.status ?? "draft"} options={["draft", "published", "archived"].map((s) => [s, s])} />
          <TextField name="launch_url" label={a.launchUrl} defaultValue={editing?.launch_url} dir="ltr" className="md:col-span-2" placeholder="https://wokwi.com/projects/…" />
          <AreaField name="summary_en" label={a.summaryEn} defaultValue={editing?.summary_en} rows={2} dir="ltr" />
          <AreaField name="summary_ar" label={a.summaryAr} defaultValue={editing?.summary_ar} rows={2} dir="rtl" />
          <AreaField name="instructions_en" label={a.instructionsEn} defaultValue={editing?.instructions_en} dir="ltr" />
          <AreaField name="instructions_ar" label={a.instructionsAr} defaultValue={editing?.instructions_ar} dir="rtl" />
          <div className="md:col-span-2"><SubmitButton pendingLabel={d.common.saving}>{d.common.save}</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
