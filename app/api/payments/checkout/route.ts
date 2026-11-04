import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { activeProvider } from "@/server/payments";
import { assertSameOrigin, json } from "@/server/http/guards";
import { rateLimit } from "@/server/rate-limit";

export async function POST(req: NextRequest) {
  const bad = assertSameOrigin(req); if (bad) return bad;
  const body = z.object({ orderId: z.string().uuid() }).safeParse(await req.json().catch(() => ({})));
  if (!body.success) return json({ error: "invalid" }, 400);
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return json({ error: "unauthorized" }, 401);
  if (!(await rateLimit(`checkout:${u.user.id}`, 20, 600))) return json({ error: "rate_limited" }, 429);
  // RLS: the user can only read their own (or their child's) orders
  const { data: order } = await supabase.from("orders").select("id, order_number, total, currency, status").eq("id", body.data.orderId).maybeSingle();
  if (!order || order.status !== "pending") return json({ error: "not_payable" }, 409);
  const provider = activeProvider();
  try {
    const returnUrl = `${env().NEXT_PUBLIC_SITE_URL}/api/payments/hyperpay/return?order=${order.id}`;
    const co = await provider.createCheckout({ ...order, total: Number(order.total), currency: order.currency as "JOD" | "USD", user_email: u.user.email ?? "" }, returnUrl);
    await createAdminClient().from("orders").update({ provider: provider.name, provider_checkout_id: co.checkoutId, is_sandbox: provider.isSandbox }).eq("id", order.id);
    return json({ provider: provider.name, sandbox: provider.isSandbox, checkoutId: co.checkoutId, widgetScriptUrl: co.widgetScriptUrl, returnUrl });
  } catch (e) {
    console.error("[checkout]", e);
    return json({ error: "provider_unavailable" }, 502);
  }
}
