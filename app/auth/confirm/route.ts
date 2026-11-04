import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/roles";

/** Email confirmation & password-recovery landing (token_hash flow, works server-side). */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const locale = req.cookies.get("wt_locale")?.value === "ar" ? "ar" : "en";
  const fallback = type === "recovery" ? `/${locale}/reset-password` : `/${locale}/dashboard?welcome=1`;
  const next = safeNext(url.searchParams.get("next"), fallback);
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? `/${locale}/reset-password` : next, url.origin));
  }
  return NextResponse.redirect(new URL(`/${locale}/login?error=link`, url.origin));
}
