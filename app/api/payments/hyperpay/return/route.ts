import { NextResponse, type NextRequest } from "next/server";
import { hyperpayProvider } from "@/server/payments/hyperpay";
import { recordVerifiedPayment } from "@/server/payments";
import { createAdminClient } from "@/lib/supabase/admin";

/** Shopper returns here from the HyperPay widget. We re-verify server-to-server; query params are NOT trusted. */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order") ?? "";
  const checkoutId = req.nextUrl.searchParams.get("id") ?? "";
  const locale = req.cookies.get("wt_locale")?.value === "ar" ? "ar" : "en";
  const back = (s: string) => NextResponse.redirect(new URL(`/${locale}/checkout/${encodeURIComponent(orderId)}?result=${s}`, req.nextUrl.origin));
  if (!/^[0-9a-f-]{36}$/.test(orderId)) return back("failed");
  const { data: order } = await createAdminClient().from("orders").select("id, provider_checkout_id").eq("id", orderId).maybeSingle();
  if (!order || order.provider_checkout_id !== checkoutId) return back("failed");
  try {
    const r = await hyperpayProvider.verify(checkoutId);
    const saved = await recordVerifiedPayment(orderId, hyperpayProvider, r);
    return back(saved.status === "paid" ? "success" : saved.status === "pending" ? "pending" : "failed");
  } catch (e) {
    console.error("[hyperpay-return]", e);
    return back("failed");
  }
}
