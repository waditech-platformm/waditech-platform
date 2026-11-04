import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { isLocale, pick, formatMoney, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Alert, Badge, Card, Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input } from "@/components/ui/form";
import { CheckoutPanel } from "@/features/payments/checkout-panel";
import { applyDiscountAction } from "@/features/payments/actions";

export default async function Checkout({ params, searchParams }: PageProps<"/[locale]/checkout/[orderId]">) {
  const { locale: l, orderId } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  await requireViewer(locale, undefined, `/${locale}/checkout/${orderId}`);
  const result = (await searchParams).result;
  const { data } = await (await createClient()).from("orders").select("id, order_number, subtotal, discount_amount, total, currency, status, discount_code, enrollment_id, is_sandbox, courses(slug, title_en, title_ar)").eq("id", orderId).maybeSingle();
  if (!data) notFound();
  const o = data as unknown as { id: string; order_number: string; subtotal: number; discount_amount: number; total: number; currency: string; status: string; discount_code: string | null; enrollment_id: string; is_sandbox: boolean; courses: { slug: string; title_en: string; title_ar: string } };
  const m = (n: number) => formatMoney(Number(n), o.currency, locale);
  return (
    <Container className="max-w-4xl py-10">
      <h1 className="text-3xl font-extrabold text-navy-900">{d.checkout.title}</h1>
      {result === "success" && o.status === "paid" && <Alert tone="success" className="mt-6">{d.checkout.success}</Alert>}
      {result === "failed" && o.status !== "paid" && <Alert tone="danger" className="mt-6">{d.checkout.failed}</Alert>}
      {result === "pending" && <Alert tone="info" className="mt-6">{d.checkout.pendingVerify}</Alert>}
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <h2 className="font-bold text-navy-900">{d.checkout.summary}</h2>
          <p className="mt-3 text-lg font-semibold">{pick(o.courses, "title", locale)}</p>
          <p className="font-latin text-xs text-subtle">{d.checkout.order} {o.order_number}</p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt>{d.checkout.subtotal}</dt><dd>{m(o.subtotal)}</dd></div>
            {Number(o.discount_amount) > 0 && <div className="flex justify-between text-success"><dt>{d.checkout.discount} ({o.discount_code})</dt><dd>−{m(o.discount_amount)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-2 text-lg font-extrabold"><dt>{d.checkout.total}</dt><dd>{m(o.total)}</dd></div>
          </dl>
          {o.status === "pending" && (
            <ActionForm action={applyDiscountAction} className="mt-5 flex gap-2">
              <input type="hidden" name="enrollment_id" value={o.enrollment_id} />
              <label htmlFor="code" className="sr-only">{d.checkout.discountCode}</label>
              <Input id="code" name="code" placeholder={d.checkout.discountCode} dir="ltr" className="font-latin uppercase" />
              <SubmitButton variant="secondary">{d.checkout.apply}</SubmitButton>
            </ActionForm>
          )}
        </Card>
        <Card className="h-fit p-6">
          <p className="mb-4 flex items-center gap-2 text-sm text-muted"><ShieldCheck className="size-5 text-success" aria-hidden />{d.checkout.hyperpayNote}</p>
          {o.status === "pending" ? <CheckoutPanel orderId={o.id} /> : (
            <div className="space-y-3"><Badge tone={o.status === "paid" ? "success" : "neutral"} className="text-sm">{d.enums.order[o.status as keyof typeof d.enums.order]}</Badge>
              {o.status === "paid" && <ButtonLink href={`/${locale}/learn/${o.courses.slug}`} className="w-full">{d.programs.continue}</ButtonLink>}</div>
          )}
        </Card>
      </div>
    </Container>
  );
}
