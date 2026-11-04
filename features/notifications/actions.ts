"use server";
import { createClient } from "@/lib/supabase/server";
import { formLocale, fdString, type ActionResult } from "@/lib/actions";

export async function markAllReadAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  void formLocale(fd);
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false };
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", u.user.id).is("read_at", null);
  return { ok: true };
}
export async function markReadAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", fdString(fd, "id"));
  return { ok: true };
}
