import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function clientKey() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  // store only a hash of the IP (data minimisation)
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

/** Server-side fixed-window rate limit backed by Postgres. Returns true when allowed. */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", { p_bucket: bucket, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) throw error;
    return data === true;
  } catch (e) {
    console.error("[rate-limit] failing open", e);
    return true;
  }
}
