import Link from "next/link";
import { Badge, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { AdminTitle, adminPage, toneFor } from "@/features/admin/page-kit";
import { setTrainerProfileStatusAction } from "@/features/admin/actions";

type Row = { trainer_id: string; slug: string; display_name_en: string; display_name_ar: string; headline_en: string | null; status: string; updated_at: string; is_test_data: boolean };

export default async function AdminTrainers({ params }: PageProps<"/[locale]/admin/trainers">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const statuses = d.trainer.profileStatuses as Record<string, string>;
  const { data } = await supabase.from("trainer_profiles").select("trainer_id, slug, display_name_en, display_name_ar, headline_en, status, updated_at, is_test_data").order("status").order("updated_at", { ascending: false });
  const rows = (data ?? []) as Row[];
  const act = (id: string, status: string, label: string, variant: "primary" | "secondary" = "secondary") => (
    <ActionForm action={setTrainerProfileStatusAction} refreshOnSuccess className="inline">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <SubmitButton size="sm" variant={variant}>{label}</SubmitButton>
    </ActionForm>
  );
  return (
    <div className="space-y-6">
      <AdminTitle title={a.trainerProfiles} subtitle={d.trainer.profileIntro} />
      {rows.length === 0 ? <p className="text-sm text-muted">{a.noneYet}</p> : (
        <Table head={[d.common.name, d.trainer.headlineEn, d.common.status, d.common.actions]}>
          {rows.map((r) => (
            <tr key={r.trainer_id}>
              <Td className="font-semibold">{locale === "ar" ? r.display_name_ar : r.display_name_en}{r.is_test_data && <span className="ms-2 text-xs text-warning">{d.common.demoBadge}</span>}</Td>
              <Td className="text-sm text-muted">{r.headline_en}</Td>
              <Td><Badge tone={toneFor(r.status)}>{statuses[r.status] ?? r.status}</Badge></Td>
              <Td className="space-x-2 whitespace-nowrap rtl:space-x-reverse">
                {r.status !== "published" && act(r.trainer_id, "published", a.publish, "primary")}
                {r.status !== "hidden" && act(r.trainer_id, "hidden", a.hide)}
                {r.status === "published" && <Link className="text-sm font-semibold text-royal-600" href={`/${locale}/trainers/${r.slug}`}>{d.community.viewProfile}</Link>}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
