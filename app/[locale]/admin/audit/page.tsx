import { formatDateTime } from "@/lib/i18n/config";
import { Badge, Table, Td } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/action-form";
import { Input } from "@/components/ui/form";
import { AdminTitle, adminPage } from "@/features/admin/page-kit";

type Row = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: unknown; created_at: string };

export default async function AdminAudit({ params, searchParams }: PageProps<"/[locale]/admin/audit">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const sp = await searchParams;
  const entity = typeof sp.entity === "string" ? sp.entity.replace(/[^a-z_]/g, "").slice(0, 40) : "";
  let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
  if (entity) q = q.eq("entity_type", entity);
  const { data } = await q;
  const rows = (data ?? []) as Row[];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, full_name").in("id", actorIds) : { data: [] };
  const names = new Map((actors ?? []).map((p) => [p.id, p.full_name]));
  return (
    <div className="space-y-6">
      <AdminTitle title={a.audit} subtitle={a.auditNote} />
      <form className="flex gap-2"><Input name="entity" defaultValue={entity} placeholder="courses, user_roles, orders…" aria-label={a.entity} className="w-64" dir="ltr" /><SubmitButton variant="secondary">{d.common.filter}</SubmitButton></form>
      <Table head={[a.time, a.actor, a.action, a.entity, a.details]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-xs">{formatDateTime(r.created_at, locale)}</Td>
            <Td className="text-sm">{r.actor_id ? names.get(r.actor_id) ?? r.actor_id.slice(0, 8) : "system"}</Td>
            <Td><Badge tone="blue">{r.action}</Badge></Td>
            <Td className="font-latin text-xs" dir="ltr">{r.entity_type}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}</Td>
            <Td className="max-w-md truncate font-latin text-xs" dir="ltr" title={JSON.stringify(r.metadata)}>{JSON.stringify(r.metadata)}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
