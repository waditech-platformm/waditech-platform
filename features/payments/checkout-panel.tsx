"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, FlaskConical } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Alert } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export function CheckoutPanel({ orderId }: { orderId: string }) {
  const { dict: d } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<{ provider: string; sandbox: boolean; checkoutId: string; widgetScriptUrl?: string; returnUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/payments/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(d.errors.generic);
    setState(j);
  }
  async function simulate(outcome: "success" | "failure") {
    if (!state) return;
    setBusy(true);
    const r = await fetch("/api/payments/sandbox/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkoutId: state.checkoutId, outcome }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    router.replace(`?result=${r.ok && j.status === "paid" ? "success" : "failed"}`);
    router.refresh();
  }
  useEffect(() => {
    if (!state?.widgetScriptUrl) return;
    const s = document.createElement("script");
    s.src = state.widgetScriptUrl; s.async = true;
    document.body.appendChild(s);
    return () => { s.remove(); };
  }, [state?.widgetScriptUrl]);

  if (!state) return (
    <div>
      <Button size="lg" className="w-full" onClick={start} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}{d.checkout.pay}</Button>
      {err && <Alert tone="danger" className="mt-3">{err}</Alert>}
    </div>
  );
  if (state.provider === "sandbox") return (
    <div className="space-y-4">
      <Alert tone="warning" title="SANDBOX">{d.checkout.sandboxNote}</Alert>
      <div className="rounded-xl bg-surface p-4 font-latin text-sm" dir="ltr"><p className="font-semibold">{d.checkout.sandboxCard}</p><p>4200 0000 0000 0000 · 12/30 · 123</p></div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={() => simulate("success")} disabled={busy}><FlaskConical className="size-4" />{d.checkout.simulateSuccess}</Button>
        <Button variant="secondary" onClick={() => simulate("failure")} disabled={busy}>{d.checkout.simulateFailure}</Button>
      </div>
    </div>
  );
  return (
    <div>
      <p className="mb-3 text-xs text-subtle">{d.checkout.hyperpayNote}</p>
      {state.sandbox && <Alert tone="warning" className="mb-3">HyperPay TEST mode</Alert>}
      <form action={state.returnUrl} className="paymentWidgets" data-brands="VISA MASTER" />
    </div>
  );
}
