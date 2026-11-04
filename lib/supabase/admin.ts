import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * SERVICE-ROLE client — bypasses RLS. Use ONLY in server code for operations that must not
 * be performed by the end user directly (payment verification, rate limiting, validated public inserts).
 * Never import from a Client Component.
 */
export function createAdminClient() {
  const e = env();
  if (!e.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
