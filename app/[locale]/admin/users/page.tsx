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

type U = { id: string; email: string; full_name: string; account_status: string; roles: string[]; created_at: string; last_sign_in_at: string | null; email_confirmed: boolean; is_test_data: boolean; total: number };
const ROLES = ["student", "parent", "trainer", "school_coordinator", "admin", "super_admin"] as const;
export default async function AdminUsers({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireAdmin(locale);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const role = typeof sp.role === "string" && (ROLES as readonly string[]).includes(sp.role) ? sp.role : null;
  const { data } = await (await createClient()).rpc("admin_list_users", { p_search: q || null, p_role: role, p_limit: 100 });
  const users = (data ?? []) as U[];
  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold text-navy-900">{d.admin.users} <span className="text-base font-medium text-subtle">({users[0]?.total ?? 0})</span></h1>
      <form className="mb-5 flex flex-wrap gap-2" role="search"><Input name="q" defaultValue={q} placeholder={d.common.search} className="w-64" aria-label={d.common.search} />
        <Select name="role" defaultValue={role ?? ""} className="w-48" aria-label={d.admin.grantRole}><option value="">{d.common.all}</option>{ROLES.map((r) => <option key={r} value={r}>{d.enums.role[r]}</option>)}</Select><SubmitButton variant="secondary">{d.common.filter}</SubmitButton></form>
      <Table head={[d.common.name, d.common.email, "Roles", d.common.status, d.common.actions]}>{users.map((u) => (
        <tr key={u.id}>
          <Td><p className="font-semibold">{u.full_name || "-"}</p><p className="text-xs text-subtle">{formatDate(u.created_at, locale)}</p><DemoBadge show={u.is_test_data} label={d.common.demoBadge} /></Td>
          <Td className="font-latin text-xs" dir="ltr">{u.email}{!u.email_confirmed && <Badge tone="warning" className="ms-1">unverified</Badge>}</Td>
          <Td><div className="flex flex-wrap gap-1">{u.roles.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 rounded-full bg-royal-50 px-2 py-0.5 text-xs font-semibold text-royal-700">{d.enums.role[r as keyof typeof d.enums.role]}
              {u.id !== viewer.id && <ActionForm action={A.revokeRoleAction} confirmText={d.admin.revokeRole + "?"}><input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="role" value={r} /><button className="text-danger" aria-label={d.admin.revokeRole}>×</button></ActionForm>}</span>
          ))}</div>
            <ActionForm action={A.grantRoleAction} className="mt-2 flex gap-1"><input type="hidden" name="user_id" value={u.id} /><Select name="role" className="h-8 w-36 text-xs" aria-label={d.admin.grantRole}>{ROLES.filter((r) => !u.roles.includes(r)).map((r) => <option key={r} value={r}>{d.enums.role[r]}</option>)}</Select><SubmitButton size="sm" variant="secondary">+</SubmitButton></ActionForm></Td>
          <Td><Badge tone={u.account_status === "active" ? "success" : "danger"}>{u.account_status}</Badge></Td>
          <Td>{u.id !== viewer.id && <ActionForm action={A.setAccountStatusAction}><input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="status" value={u.account_status === "active" ? "suspended" : "active"} /><SubmitButton size="sm" variant={u.account_status === "active" ? "secondary" : "primary"}>{u.account_status === "active" ? d.admin.suspend : d.admin.activate}</SubmitButton></ActionForm>}</Td>
        </tr>
      ))}</Table>
    </div>
  );
}
