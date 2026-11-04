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

import Link from "next/link";
export default async function AdminCertificates({ params }: PageProps<"/[locale]/admin/certificates">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const { data } = await (await createClient()).from("certificates").select("id, certificate_number, student_name, course_title_en, course_title_ar, completion_date, status, revoked_reason, is_test_data").order("issued_at", { ascending: false });
  return (
    <div><h1 className="mb-2 text-2xl font-extrabold text-navy-900">{d.admin.certificates}</h1><p className="mb-5 text-sm text-muted">{d.trainer.issueCertificate}: {d.trainer.title} → {d.trainer.roster}</p>
      <Table head={[d.certificates.number, d.common.name, d.nav.programs, d.common.date, d.common.status, d.common.actions]}>{(data ?? []).map((c) => (
        <tr key={c.id}><Td><Link href={`/${locale}/certificates/${c.certificate_number}`} className="font-latin font-semibold text-royal-700">{c.certificate_number}</Link> <DemoBadge show={c.is_test_data} label={d.common.demoBadge} /></Td><Td>{c.student_name}</Td><Td>{pick(c, "course_title", locale)}</Td><Td>{formatDate(c.completion_date, locale)}</Td>
          <Td><Badge tone={c.status === "valid" ? "success" : "danger"}>{c.status}</Badge>{c.revoked_reason && <p className="text-xs text-subtle">{c.revoked_reason}</p>}</Td>
          <Td>{c.status === "valid" && <ActionForm action={A.revokeCertificateAction} confirmText={d.admin.revoke + "?"} className="flex gap-1"><input type="hidden" name="id" value={c.id} /><Input name="reason" placeholder={d.admin.reason} className="h-9 w-36" aria-label={d.admin.reason} /><SubmitButton size="sm" variant="danger">{d.admin.revoke}</SubmitButton></ActionForm>}</Td></tr>
      ))}</Table></div>
  );
}
