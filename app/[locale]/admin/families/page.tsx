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

export default async function AdminFamilies({ params }: PageProps<"/[locale]/admin/families">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const { data } = await (await createClient()).from("parent_student_links").select("id, status, created_at, verified_at, parent:parent_id(full_name), student:student_id(full_name)").order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as { id: string; status: string; created_at: string; parent: { full_name: string } | null; student: { full_name: string } | null }[];
  return (
    <div><h1 className="mb-2 text-2xl font-extrabold text-navy-900">{d.admin.families}</h1><p className="mb-5 max-w-2xl text-sm text-muted">{d.parent.linkHelp}</p>
      <Table head={[d.enums.role.parent, d.enums.role.student, d.common.date, d.common.status, d.common.actions]}>{rows.map((r) => (
        <tr key={r.id}><Td className="font-semibold">{r.parent?.full_name}</Td><Td>{r.student?.full_name}</Td><Td className="text-subtle">{formatDateTime(r.created_at, locale)}</Td>
          <Td><Badge tone={r.status === "verified" ? "success" : r.status === "pending" ? "warning" : "danger"}>{r.status}</Badge></Td>
          <Td><div className="flex gap-1">{r.status !== "verified" && <ActionForm action={A.setLinkStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="verified" /><SubmitButton size="sm">{d.admin.verify}</SubmitButton></ActionForm>}
            {r.status === "pending" && <ActionForm action={A.setLinkStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="rejected" /><SubmitButton size="sm" variant="secondary">{d.admin.reject}</SubmitButton></ActionForm>}
            {r.status === "verified" && <ActionForm action={A.setLinkStatusAction} confirmText={d.admin.revoke + "?"}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="revoked" /><SubmitButton size="sm" variant="danger">{d.admin.revoke}</SubmitButton></ActionForm>}</div></Td></tr>
      ))}</Table></div>
  );
}
