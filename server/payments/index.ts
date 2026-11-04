import "server-only";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sandboxProvider } from "./sandbox";
import { hyperpayProvider } from "./hyperpay";
import type { PaymentProvider, VerifiedResult } from "./types";

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
