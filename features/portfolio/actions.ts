"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbError, fdOptional, fdString, formLocale, zodErrors, type ActionResult } from "@/lib/actions";
import { getDict } from "@/lib/i18n/dictionary";

const schema = z.object({
  title: z.string().trim().min(3, "min").max(160, "max"),
  description: z.string().trim().max(5000, "max").nullable(),
  link_url: z.string().trim().url("url").regex(/^https?:\/\//i, "url").nullable(),
  cover_url: z.string().trim().max(500).regex(/^(https:\/\/|\/media\/)/i, "url").nullable(),
  visibility: z.enum(["private", "academy", "public"]),
  course_id: z.string().uuid().nullable(),
});
export async function saveProjectAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = schema.safeParse({ title: fdString(fd, "title"), description: fdOptional(fd, "description"), link_url: fdOptional(fd, "link_url"), cover_url: fdOptional(fd, "cover_url"), visibility: fdString(fd, "visibility") || "private", course_id: fdOptional(fd, "course_id") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.errors.unauthorized };
  const id = fdString(fd, "id");
  const { error } = id
    ? await supabase.from("student_projects").update(parsed.data).eq("id", id)
    : await supabase.from("student_projects").insert({ ...parsed.data, student_id: u.user.id });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true, message: d.common.saved };
}
export async function deleteProjectAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const supabase = await createClient();
  const { error } = await supabase.from("student_projects").delete().eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true };
}
