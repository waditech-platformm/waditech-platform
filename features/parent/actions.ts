"use server";
import { createClient } from "@/lib/supabase/server";
import { dbError, fdString, formLocale, type ActionResult } from "@/lib/actions";
import { getDict } from "@/lib/i18n/dictionary";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function requestLinkAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const code = fdString(fd, "code").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  if (code.length < 6) return { ok: false, fieldErrors: { code: d.validation.required } };
  // codes are short; throttle guessing
  if (!(await rateLimit(`link:${await clientKey()}`, 10, 3600))) return { ok: false, error: d.errors.rateLimited };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_parent_link", { p_code: code });
  if (error) return { ok: false, error: error.code === "P0002" ? d.parent.invalidCode : dbError(error, locale) };
  return { ok: true, message: d.parent.requested };
}
