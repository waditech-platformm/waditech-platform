import "server-only";
import { createDecipheriv } from "node:crypto";
import { env } from "@/lib/env";
import { formatAmount, type PaymentProvider, type VerifiedResult } from "./types";

/**
 * HyperPay (OPPWA) COPYandPAY adapter.
 * - Test endpoint by default (eu-test.oppwa.com). Live requires HYPERPAY_LIVE_ENABLED=true AND explicit approval.
 * - Card data is entered in HyperPay's widget; it never reaches this server.
 * - Result codes per OPPWA documentation: success /^(000\.000\.|000\.100\.1|000\.[36])/, pending /^(000\.200)/.
 *   Verify these patterns and JOD amount formatting with HyperPay during onboarding.
 */
const SUCCESS = /^(000\.000\.|000\.100\.1|000\.[36])/;
const PENDING = /^(000\.200)/;

function cfg() {
  const e = env();
  if (!e.HYPERPAY_ACCESS_TOKEN || !e.HYPERPAY_ENTITY_ID_VISA_MASTER) throw new Error("HyperPay is not configured");
  const live = !/test/.test(e.HYPERPAY_BASE_URL);
  if (live && e.HYPERPAY_LIVE_ENABLED !== "true") throw new Error("Live HyperPay endpoint blocked: set HYPERPAY_LIVE_ENABLED=true only after approval");
  return { base: e.HYPERPAY_BASE_URL.replace(/\/$/, ""), token: e.HYPERPAY_ACCESS_TOKEN, entity: e.HYPERPAY_ENTITY_ID_VISA_MASTER, live };
}

export const hyperpayProvider: PaymentProvider = {
  name: "hyperpay",
  get isSandbox() { try { return !cfg().live; } catch { return true; } },
  async createCheckout(order) {
    const c = cfg();
    const body = new URLSearchParams({
      entityId: c.entity, amount: formatAmount(order.total, order.currency), currency: order.currency,
      paymentType: "DB", merchantTransactionId: order.id, "customer.email": order.user_email,
      ...(c.live ? {} : { testMode: "EXTERNAL" }),
    });
    const r = await fetch(`${c.base}/v1/checkouts`, { method: "POST", headers: { Authorization: `Bearer ${c.token}`, "content-type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
    const j = (await r.json()) as { id?: string; result?: { code: string; description: string } };
    if (!r.ok || !j.id) throw new Error(`HyperPay checkout failed: ${j.result?.code ?? r.status}`);
    return { checkoutId: j.id, widgetScriptUrl: `${c.base}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(j.id)}` };
  },
  async verify(checkoutId): Promise<VerifiedResult> {
    const c = cfg();
    if (!/^[A-Za-z0-9.\-]{8,64}$/.test(checkoutId)) throw new Error("invalid checkout id");
    const r = await fetch(`${c.base}/v1/checkouts/${encodeURIComponent(checkoutId)}/payment?entityId=${encodeURIComponent(c.entity)}`, { headers: { Authorization: `Bearer ${c.token}` }, cache: "no-store" });
    const j = (await r.json()) as { id?: string; amount?: string; currency?: "JOD" | "USD"; result: { code: string; description: string } };
    return { succeeded: SUCCESS.test(j.result.code), pending: PENDING.test(j.result.code), reference: j.id ?? checkoutId, amount: Number(j.amount ?? 0),
      currency: (j.currency ?? "JOD"), code: j.result.code, description: j.result.description, sandbox: !c.live };
  },
};

/** Decrypts an encrypted HyperPay webhook (AES-256-GCM). Returns null if the key is missing or authentication fails. */
export function decryptHyperpayWebhook(bodyHex: string, ivHex: string, tagHex: string, keyHex?: string) {
  if (!keyHex) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(bodyHex, "hex")), decipher.final()]).toString("utf8"));
  } catch { return null; }
}
