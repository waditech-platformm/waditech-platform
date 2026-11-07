import { Badge, Card, DemoBadge, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { SelectField, TextField } from "@/features/admin/fields";
import { AdminTitle, adminPage } from "@/features/admin/page-kit";
import * as A from "@/features/admin/actions";

type Org = { id: string; name: string; name_ar: string | null; slug: string; type: string; city: string | null; status: string; is_test_data: boolean; show_publicly: boolean; organization_members: { user_id: string; member_role: string; profiles: { full_name: string } | null }[] };

export default async function AdminSchools({ params }: PageProps<"/[locale]/admin/schools">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const { data } = await supabase.from("organizations").select("id, name, name_ar, slug, type, city, status, is_test_data, show_publicly, organization_members(user_id, member_role, profiles(full_name))").order("name");
  const orgs = (data ?? []) as unknown as Org[];
  return (
    <div className="space-y-6">
      <AdminTitle title={a.schools} />
      <div className="space-y-4">
        {orgs.map((o) => (
          <Card key={o.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">{locale === "ar" && o.name_ar ? o.name_ar : o.name}</h2>
              <Badge tone="blue">{o.type}</Badge>{o.city && <Badge>{o.city}</Badge>}
              <DemoBadge show={o.is_test_data} label={d.common.demoBadge} />
              <Badge tone={o.show_publicly ? "cyan" : "neutral"}>{o.show_publicly ? a.listedPublicly : a.notListedPublicly}</Badge>
              <ActionForm action={A.setOrgPublicAction} confirmText={o.show_publicly ? undefined : a.listPubliclyHint} className="ms-auto">
                <input type="hidden" name="organization_id" value={o.id} />
                <input type="hidden" name="show_publicly" value={o.show_publicly ? "false" : "true"} />
                <button type="submit" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-royal-600 ring-1 ring-line hover:bg-royal-50">{o.show_publicly ? a.unlistPublicly : a.listPublicly}</button>
              </ActionForm>
            </div>
            <div className="mt-4">
              <Table head={[d.common.name, a.memberRole, d.common.actions]}>
                {o.organization_members.map((m) => (
                  <tr key={`${m.user_id}-${m.member_role}`}>
                    <Td className="font-semibold">{m.profiles?.full_name ?? "-"}</Td>
                    <Td><Badge tone={m.member_role === "coordinator" ? "cyan" : "neutral"}>{m.member_role}</Badge></Td>
                    <Td>
                      <ActionForm action={A.removeOrgMemberAction} confirmText={`${d.common.delete}?`}>
                        <input type="hidden" name="organization_id" value={o.id} /><input type="hidden" name="user_id" value={m.user_id} /><input type="hidden" name="member_role" value={m.member_role} />
                        <button type="submit" className="text-xs font-semibold text-danger">{d.common.delete}</button>
                      </ActionForm>
                    </Td>
                  </tr>
                ))}
              </Table>
            </div>
            <ActionForm action={A.addOrgMemberAction} resetOnSuccess className="mt-4 grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
              <input type="hidden" name="organization_id" value={o.id} />
              <TextField name="email" label={d.common.email} type="email" dir="ltr" required />
              <SelectField name="member_role" label={a.memberRole} options={[["student", "student"], ["trainer", "trainer"], ["coordinator", "coordinator"]]} />
              <SubmitButton>{a.addMember}</SubmitButton>
            </ActionForm>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">{a.newOrganization}</h2>
        <ActionForm action={A.saveOrganizationAction} resetOnSuccess className="grid gap-4 md:grid-cols-2">
          <TextField name="name" label={a.titleEn} required dir="ltr" />
          <TextField name="name_ar" label={a.titleAr} dir="rtl" />
          <TextField name="slug" label={a.slug} required dir="ltr" />
          <SelectField name="type" label={a.category} options={["school", "university", "company", "community", "other"].map((t) => [t, t])} />
          <TextField name="city" label={a.city} />
          <TextField name="contact_email" label={d.common.email} type="email" dir="ltr" />
          <div className="md:col-span-2"><SubmitButton pendingLabel={d.common.saving}>{d.common.create}</SubmitButton></div>
        </ActionForm>
      </Card>
    </div>
  );
}
