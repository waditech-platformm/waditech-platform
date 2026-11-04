"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbError, fdString, formLocale, type ActionResult } from "@/lib/actions";

export async function applyDiscountAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const enrollment = z.string().uuid().safeParse(fdString(fd, "enrollment_id"));
  const code = fdString(fd, "code").toUpperCase().slice(0, 32);
  if (!enrollment.success || !code) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order_for_enrollment", { p_enrollment: enrollment.data, p_discount_code: code });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true, data: { redirect: `/${locale}/checkout/${(data as { id: string }).id}` } };
}
