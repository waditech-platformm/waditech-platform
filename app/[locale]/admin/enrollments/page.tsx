import { isLocale, pick, formatDate, formatDateTime, formatMoney, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, DemoBadge, EmptyState, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { AreaField, CheckField, SelectField, TextField, toLocalInput } from "@/features/admin/fields";
import * as A from "@/features/admin/actions";
void formatDate; void formatMoney; void pick; void toLocalInput; void Input; void Select; void AreaField; void CheckField; void SelectField; void TextField; void DemoBadge; void EmptyState; void Card; void Badge; void formatDateTime;

const ST = ["pending_payment", "pending_approval", "active", "completed", "cancelled", "refunded"] as const;
export default async function AdminEnrollments({ params, searchParams }: PageProps<"/[locale]/admin/enrollments">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (ST as readonly string[]).includes(sp.status) ? sp.status : null;
  const supabase = await createClient();
  let q = supabase.from("enrollments").select("id, status, source, enrolled_at, courses(title_en, title_ar), profiles:student_id(full_name)").order("enrolled_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const [{ data }, { data: courses }] = await Promise.all([q, supabase.from("courses").select("id, title_en").eq("status", "published").order("title_en")]);
  const rows = (data ?? []) as unknown as { id: string; status: string; source: string; enrolled_at: string; courses: { title_en: string; title_ar: string }; profiles: { full_name: string } | null }[];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-navy-900">{d.admin.enrollments}</h1>
      <Card className="p-5"><h2 className="font-bold">{d.admin.enrollStudent}</h2>
        <ActionForm action={A.adminEnrollAction} resetOnSuccess className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <TextField name="email" label={d.admin.studentEmail} type="email" dir="ltr" required />
          <SelectField name="course_id" label={d.nav.programs} options={(courses ?? []).map((c) => [c.id, c.title_en] as [string, string])} />
          <SubmitButton>{d.common.create}</SubmitButton>
        </ActionForm></Card>
      <form className="flex gap-2"><Select name="status" defaultValue={status ?? ""} className="w-56" aria-label={d.admin.filterStatus}><option value="">{d.common.all}</option>{ST.map((s) => <option key={s} value={s}>{d.enums.enrollment[s]}</option>)}</Select><SubmitButton variant="secondary">{d.common.filter}</SubmitButton></form>
      <Table head={[d.common.name, d.nav.programs, "Source", d.common.status, d.common.actions]}>{rows.map((r) => (
        <tr key={r.id}><Td className="font-semibold">{r.profiles?.full_name}</Td><Td>{pick(r.courses, "title", locale)}</Td><Td className="text-xs">{r.source} · {formatDate(r.enrolled_at, locale)}</Td>
          <Td><Badge tone={r.status === "active" ? "success" : r.status.startsWith("pending") ? "warning" : "neutral"}>{d.enums.enrollment[r.status as keyof typeof d.enums.enrollment]}</Badge></Td>
          <Td><ActionForm action={A.setEnrollmentStatusAction} className="flex gap-1"><input type="hidden" name="id" value={r.id} /><Select name="status" defaultValue={r.status} className="h-9 w-44" aria-label={d.common.status}>{ST.map((s) => <option key={s} value={s}>{d.enums.enrollment[s]}</option>)}</Select><SubmitButton size="sm" variant="secondary">{d.common.save}</SubmitButton></ActionForm></Td></tr>
      ))}</Table>
    </div>
  );
}
