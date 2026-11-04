import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailProvider, renderNotificationEmail, type QueuedNotification } from "@/server/email";

/**
 * Email worker. Called by a scheduler (Supabase pg_cron every minute and/or Vercel Cron) with
 * `Authorization: Bearer <CRON_SECRET>`. Claims due notification emails, sends them, reports results.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = env().CRON_SECRET;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

async function run(req: NextRequest) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const provider = emailProvider();
  if (provider.name === "none") return Response.json({ provider: "none", sent: 0, failed: 0, note: "no email provider configured; emails stay queued" });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_notification_emails", { p_limit: 25 });
  if (error) return Response.json({ error: "claim_failed" }, { status: 500 });
  let sent = 0, failed = 0;
  for (const n of (data ?? []) as (QueuedNotification & { id: string })[]) {
    try {
      await provider.send(renderNotificationEmail(n, env().NEXT_PUBLIC_SITE_URL));
      await admin.rpc("report_notification_email", { p_id: n.id, p_ok: true });
      sent++;
    } catch (e) {
      await admin.rpc("report_notification_email", { p_id: n.id, p_ok: false, p_error: (e as Error).message });
      failed++;
    }
  }
  return Response.json({ provider: provider.name, sent, failed });
}

export const GET = run;
export const POST = run;
