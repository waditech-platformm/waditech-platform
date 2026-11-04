import { formatDateTime } from "@/lib/i18n/config";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Select } from "@/components/ui/form";
import { AdminTitle, adminPage, toneFor } from "@/features/admin/page-kit";
import * as A from "@/features/admin/actions";

type Msg = { id: string; name: string; email: string; phone: string | null; topic: string; message: string; locale: string; status: string; created_at: string };

export default async function AdminMessages({ params, searchParams }: PageProps<"/[locale]/admin/messages">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const sp = await searchParams;
  const status = typeof sp.status === "string" && ["new", "in_progress", "closed"].includes(sp.status) ? sp.status : null;
  let q = supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  const rows = (data ?? []) as Msg[];
  return (
    <div className="space-y-6">
      <AdminTitle title={a.messages} />
      <form className="flex gap-2">
        <Select name="status" defaultValue={status ?? ""} className="w-56" aria-label={a.filterStatus}><option value="">{d.common.all}</option>{["new", "in_progress", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        <SubmitButton variant="secondary">{d.common.filter}</SubmitButton>
      </form>
      {rows.length === 0 ? <EmptyState title={d.common.emptyTitle} /> : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{m.name}</p>
                  <a href={`mailto:${m.email}`} className="font-latin text-sm text-royal-600" dir="ltr">{m.email}</a>
                  {m.phone && <span className="font-latin text-sm text-muted" dir="ltr">{m.phone}</span>}
                  <Badge tone="blue">{a.topic}: {m.topic}</Badge>
                  <Badge tone={toneFor(m.status)}>{m.status}</Badge>
                  <span className="ms-auto text-xs text-subtle">{formatDateTime(m.created_at, locale)}</span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm" dir="auto">{m.message}</p>
                <ActionForm action={A.setMessageStatusAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <Select name="status" defaultValue={m.status} className="h-9 w-44" aria-label={d.common.status}>{["new", "in_progress", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
                  <SubmitButton size="sm" variant="secondary">{d.common.save}</SubmitButton>
                </ActionForm>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
