import type { NextRequest } from "next/server";
import { decryptHyperpayWebhook, hyperpayProvider } from "@/server/payments/hyperpay";
import { recordVerifiedPayment } from "@/server/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { json } from "@/server/http/guards";

/**
 * Encrypted HyperPay webhook. Payload authenticity is checked by AES-GCM auth tag; even then we
 * re-query the payment status from HyperPay before recording anything.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const iv = req.headers.get("x-initialization-vector") ?? "";
  const tag = req.headers.get("x-authentication-tag") ?? "";
  const payload = decryptHyperpayWebhook(body.trim(), iv, tag, process.env.HYPERPAY_WEBHOOK_KEY);
  if (!payload) return json({ error: "unauthenticated" }, 401);
  const p = (payload.payload ?? {}) as { merchantTransactionId?: string; ndc?: string };
  const orderId = p.merchantTransactionId;
  if (!orderId) return json({ ok: true });
  const { data: order } = await createAdminClient().from("orders").select("id, provider_checkout_id").eq("id", orderId).maybeSingle();
  if (!order?.provider_checkout_id) return json({ ok: true });
  try {
    const r = await hyperpayProvider.verify(order.provider_checkout_id);
    await recordVerifiedPayment(order.id, hyperpayProvider, r);
  } catch (e) { console.error("[hyperpay-webhook]", e); }
  return json({ ok: true });
}
