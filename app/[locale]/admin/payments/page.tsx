import { formatDateTime, formatMoney, pick } from "@/lib/i18n/config";
import { Alert, Badge, Table, Td } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { AdminTitle, adminPage, toneFor } from "@/features/admin/page-kit";
import * as A from "@/features/admin/actions";

const ST = ["pending", "paid", "failed", "cancelled", "refunded", "partially_refunded"] as const;
type Order = { id: string; order_number: string; total: number; currency: string; status: string; provider: string; is_sandbox: boolean; paid_at: string | null; created_at: string; courses: { title_en: string; title_ar: string } | null; profiles: { full_name: string } | null };
type Tx = { id: string; order_id: string; provider: string; type: string; provider_reference: string | null; amount: number; currency: string; status: string; result_code: string | null; is_sandbox: boolean; created_at: string };

export default async function AdminPayments({ params, searchParams }: PageProps<"/[locale]/admin/payments">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const sp = await searchParams;
  const status = typeof sp.status === "string" && (ST as readonly string[]).includes(sp.status) ? sp.status : null;
  let q = supabase.from("orders").select("id, order_number, total, currency, status, provider, is_sandbox, paid_at, created_at, courses(title_en, title_ar), profiles:student_id(full_name)").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const [{ data: orders }, { data: txs }] = await Promise.all([q, supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(50)]);
  const rows = (orders ?? []) as unknown as Order[];
  return (
    <div className="space-y-6">
      <AdminTitle title={a.payments} />
      <Alert tone="info">{a.paymentsNote}</Alert>
      <form className="flex gap-2">
        <Select name="status" defaultValue={status ?? ""} className="w-56" aria-label={a.filterStatus}><option value="">{d.common.all}</option>{ST.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        <SubmitButton variant="secondary">{d.common.filter}</SubmitButton>
      </form>
      <Table head={["#", d.common.name, d.nav.programs, a.amount, d.common.status, d.common.actions]}>
        {rows.map((o) => (
          <tr key={o.id}>
            <Td className="font-latin text-xs" dir="ltr">{o.order_number}<div className="text-subtle">{formatDateTime(o.created_at, locale)}</div></Td>
            <Td className="font-semibold">{o.profiles?.full_name ?? "-"}</Td>
            <Td>{o.courses ? pick(o.courses, "title", locale) : "-"}</Td>
            <Td className="font-latin" dir="ltr">{formatMoney(Number(o.total), o.currency, locale)}{o.is_sandbox && <Badge tone="warning" className="ms-2">{a.sandboxOrder}</Badge>}</Td>
            <Td><Badge tone={toneFor(o.status)}>{o.status}</Badge><div className="text-xs text-subtle">{o.provider}</div></Td>
            <Td>
              {o.status === "paid" && (
                <ActionForm action={A.refundOrderAction} confirmText={`${a.refund}?`} className="flex flex-wrap gap-1">
                  <input type="hidden" name="id" value={o.id} />
                  <Input name="amount" type="number" step="0.001" defaultValue={Number(o.total)} aria-label={a.amount} className="h-9 w-28" />
                  <Input name="reference" placeholder={a.reference} aria-label={a.reference} className="h-9 w-32" />
                  <SubmitButton size="sm" variant="secondary">{a.refund}</SubmitButton>
                </ActionForm>
              )}
            </Td>
          </tr>
        ))}
      </Table>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">{a.transactions}</h2>
        <Table head={[a.time, a.provider, a.reference, a.amount, d.common.status]}>
          {((txs ?? []) as Tx[]).map((t) => (
            <tr key={t.id}>
              <Td className="text-xs">{formatDateTime(t.created_at, locale)}</Td>
              <Td className="text-xs">{t.provider} · {t.type}{t.is_sandbox ? " · sandbox" : ""}</Td>
              <Td className="font-latin text-xs" dir="ltr">{t.provider_reference ?? "-"}<div className="text-subtle">{t.result_code}</div></Td>
              <Td className="font-latin" dir="ltr">{formatMoney(Number(t.amount), t.currency, locale)}</Td>
              <Td><Badge tone={toneFor(t.status)}>{t.status}</Badge></Td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  );
}
