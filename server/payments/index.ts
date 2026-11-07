import "server-only";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sandboxProvider } from "./sandbox";
import { hyperpayProvider } from "./hyperpay";
import type { PaymentProvider, VerifiedResult } from "./types";

/*
 * TODO(launch): PAYMENTS. Staging uses the sandbox provider (no money moves).
 *   1. Get HyperPay TEST credentials; set PAYMENTS_PROVIDER=hyperpay, HYPERPAY_ACCESS_TOKEN, HYPERPAY_ENTITY_ID_VISA_MASTER
 *      (HYPERPAY_BASE_URL defaults to eu-test). Run a full test purchase + refund.
 *   2. Live only with the owner's written approval: HYPERPAY_BASE_URL=https://eu-prod.oppwa.com and HYPERPAY_LIVE_ENABLED=true.
 *   3. Register app/api/payments/hyperpay/webhook in the HyperPay dashboard (with its secret) and test that a payment
 *      confirmed after the browser closes still activates the enrollment.
 *   Never trust a client-side "paid" signal; results are verified here, server-side, before recordVerifiedResult.
 */
export function activeProvider(): PaymentProvider {
  return env().PAYMENTS_PROVIDER === "hyperpay" ? hyperpayProvider : sandboxProvider;
}
export function providerByName(n: string): PaymentProvider {
  return n === "hyperpay" ? hyperpayProvider : sandboxProvider;
}

/** Persist a VERIFIED provider result through the service-role-only database function. Idempotent. */
export async function recordVerifiedPayment(orderId: string, provider: PaymentProvider, r: VerifiedResult) {
  if (r.pending) return { status: "pending" as const };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("record_payment_result", {
    p_order: orderId, p_provider: provider.name, p_reference: r.reference, p_amount: r.amount, p_currency: r.currency,
    p_succeeded: r.succeeded, p_result_code: r.code, p_result_description: r.description, p_is_sandbox: r.sandbox,
  });
  if (error) throw error;
  return { status: (data as { status: string }).status };
}
