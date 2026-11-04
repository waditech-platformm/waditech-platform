import { formatDateTime } from "@/lib/i18n/config";
import { Card, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { AreaField, SelectField, TextField } from "@/features/admin/fields";
import { AdminTitle, adminPage } from "@/features/admin/page-kit";
import * as A from "@/features/admin/actions";

export default async function AdminNotifications({ params }: PageProps<"/[locale]/admin/notifications">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const { data } = await supabase.from("audit_logs").select("id, action, metadata, created_at").eq("action", "broadcast").order("created_at", { ascending: false }).limit(30);
  const roles: [string, string][] = (["student", "parent", "trainer", "school_coordinator", "admin"] as const).map((r) => [r, d.enums?.role?.[r] ?? r]);
  return (
    <div className="space-y-6">
      <AdminTitle title={a.notifications} subtitle={a.notificationsNote} />
      <Card className="p-5">
        <ActionForm action={A.broadcastAction} resetOnSuccess className="grid gap-4 md:grid-cols-2">
          <SelectField name="role" label={a.broadcastTo} options={roles} />
          <TextField name="link" label={a.linkOptional} dir="ltr" />
          <TextField name="title_en" label={a.titleEn} required dir="ltr" />
          <TextField name="title_ar" label={a.titleAr} required dir="rtl" />
          <AreaField name="body_en" label={a.bodyShortEn} rows={3} dir="ltr" />
          <AreaField name="body_ar" label={a.bodyShortAr} rows={3} dir="rtl" />
          <div className="md:col-span-2"><SubmitButton pendingLabel={d.common.saving}>{a.send}</SubmitButton></div>
        </ActionForm>
      </Card>
      <Table head={[a.time, a.details]}>
        {(data ?? []).map((r) => (
          <tr key={r.id}><Td className="text-xs">{formatDateTime(r.created_at, locale)}</Td><Td className="font-latin text-xs" dir="ltr">{JSON.stringify(r.metadata)}</Td></tr>
        ))}
      </Table>
    </div>
  );
}
