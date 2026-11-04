import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { encodeSandboxOutcome, orderIdFromSandboxCheckout, sandboxProvider } from "@/server/payments/sandbox";
import { recordVerifiedPayment } from "@/server/payments";
import { assertSameOrigin, json } from "@/server/http/guards";

/** Simulates the provider's server-side confirmation. Disabled in production. */
export async function POST(req: NextRequest) {
  if (env().APP_ENV === "production") return json({ error: "disabled" }, 404);
  const bad = assertSameOrigin(req); if (bad) return bad;
  const body = z.object({ checkoutId: z.string().min(10).max(2000), outcome: z.enum(["success", "failure"]) }).safeParse(await req.json().catch(() => ({})));
  if (!body.success) return json({ error: "invalid" }, 400);
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return json({ error: "unauthorized" }, 401);
  const orderId = orderIdFromSandboxCheckout(body.data.checkoutId);
  if (!orderId) return json({ error: "invalid" }, 400);
  const { data: visible } = await supabase.from("orders").select("id").eq("id", orderId).maybeSingle(); // ownership via RLS
  if (!visible) return json({ error: "not_found" }, 404);
  const { data: order } = await createAdminClient().from("orders").select("id, provider_checkout_id").eq("id", orderId).single();
  if (order?.provider_checkout_id !== body.data.checkoutId) return json({ error: "checkout_mismatch" }, 409);
  try {
    const result = await sandboxProvider.verify(encodeSandboxOutcome(body.data.checkoutId, body.data.outcome));
    const saved = await recordVerifiedPayment(orderId, sandboxProvider, result);
    return json({ status: saved.status });
  } catch (e) {
    console.error("[sandbox]", e);
    return json({ error: "verification_failed" }, 400);
  }
}
