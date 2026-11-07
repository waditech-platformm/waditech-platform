import { isLocale, pick, formatDate, formatDateTime, formatMoney, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, DemoBadge, EmptyState } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { AreaField, CheckField, SelectField, TextField, toLocalInput } from "@/features/admin/fields";
import * as A from "@/features/admin/actions";
void formatDate; void formatMoney; void pick; void toLocalInput; void Input; void Select; void AreaField; void CheckField; void SelectField; void TextField; void DemoBadge; void EmptyState; void Card; void Badge; void formatDateTime;

export default async function AdminProjects({ params }: PageProps<"/[locale]/admin/projects">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const { data } = await (await createClient()).from("student_projects").select("id, title, description, link_url, cover_url, visibility, approval_status, created_at, profiles:student_id(full_name)").eq("visibility", "public").order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as { id: string; title: string; description: string | null; link_url: string | null; approval_status: string; created_at: string; profiles: { full_name: string } | null }[];
  return (
    <div><h1 className="mb-5 text-2xl font-extrabold text-navy-900">{d.admin.projects}</h1>
      {rows.length === 0 ? <EmptyState title={d.common.emptyTitle} /> : <div className="space-y-3">{rows.map((p) => (
        <Card key={p.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-bold text-navy-900">{p.title} <Badge tone={p.approval_status === "approved" ? "success" : p.approval_status === "pending" ? "warning" : "danger"}>{d.dashboard.approval[p.approval_status as keyof typeof d.dashboard.approval]}</Badge></p><p className="text-sm text-muted">{p.profiles?.full_name} · {formatDate(p.created_at, locale)}</p>{p.description && <p className="mt-1 text-sm">{p.description}</p>}</div>
          <div className="flex gap-2">{(["approved", "rejected"] as const).filter((s) => s !== p.approval_status).map((s) => <ActionForm key={s} action={A.setProjectApprovalAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={s} /><SubmitButton size="sm" variant={s === "approved" ? "primary" : "secondary"}>{s === "approved" ? d.admin.approve : d.admin.reject}</SubmitButton></ActionForm>)}</div>
        </Card>
      ))}</div>}
    </div>
  );
}
