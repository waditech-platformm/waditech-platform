"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbError, fdOptional, fdString, formLocale, zodErrors, type ActionResult } from "@/lib/actions";
import { getDict } from "@/lib/i18n/dictionary";
import { clientKey, rateLimit } from "@/server/rate-limit";

const uuid = z.string().uuid();

export async function registerEventAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const id = uuid.safeParse(fdString(fd, "event_id"));
  if (!id.success) return { ok: false, error: d.errors.generic };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_event", { p_event: id.data, p_attendee_name: fdOptional(fd, "attendee_name") });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true, message: (data as { status: string }).status === "waitlisted" ? d.events.waitlisted : d.events.registered };
}
export async function cancelEventRegistrationAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const id = uuid.safeParse(fdString(fd, "registration_id"));
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("event_registrations").update({ status: "cancelled" }).eq("id", id.data);
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true };
}

const teamSchema = z.object({
  competition_id: uuid,
  name: z.string().trim().min(2, "min").max(80, "max"),
  members: z.array(z.object({ name: z.string().min(2).max(80), age: z.number().int().min(5).max(25).nullable() })).min(1, "required").max(10, "max"),
  project_summary: z.string().trim().max(3000, "max").nullable(),
});
export async function registerTeamAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const members = fdString(fd, "members").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, age] = line.split(/[,،]/).map((s) => s.trim());
    const n = Number(age);
    return { name: (name ?? "").slice(0, 80), age: Number.isFinite(n) && n > 0 ? Math.round(n) : null };
  });
  const parsed = teamSchema.safeParse({ competition_id: fdString(fd, "competition_id"), name: fdString(fd, "name"), members, project_summary: fdOptional(fd, "project_summary") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.errors.unauthorized };
  const { error } = await supabase.from("competition_teams").insert({ ...parsed.data, captain_id: u.user.id });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true, message: d.competitions.submitted };
}
export async function withdrawTeamAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const id = uuid.safeParse(fdString(fd, "team_id"));
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("competition_teams").update({ status: "withdrawn" }).eq("id", id.data);
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true };
}

const scholarshipSchema = z.object({
  scholarship_id: uuid,
  student_name: z.string().trim().min(2, "min").max(120, "max"),
  statement: z.string().trim().min(50, "min").max(5000, "max"),
});
export async function applyScholarshipAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = scholarshipSchema.safeParse({ scholarship_id: fdString(fd, "scholarship_id"), student_name: fdString(fd, "student_name"), statement: fdString(fd, "statement") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.errors.unauthorized };
  const { error } = await supabase.from("scholarship_applications").insert({ ...parsed.data, applicant_id: u.user.id });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true, message: d.scholarships.applied };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "min").max(120, "max"),
  email: z.string().trim().toLowerCase().email("email").max(254),
  phone: z.string().trim().max(32, "max").nullable(),
  topic: z.enum(["general", "enrollment", "schools", "partnership", "media", "support"]),
  message: z.string().trim().min(10, "min").max(5000, "max"),
  website: z.string().max(0).optional(), // honeypot
});
export async function contactAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = contactSchema.safeParse({
    name: fdString(fd, "name"), email: fdString(fd, "email"), phone: fdOptional(fd, "phone"),
    topic: fdString(fd, "topic") || "general", message: fdString(fd, "message"), website: fdString(fd, "website"),
  });
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true, message: d.contact.sent }; // silently drop bots
    return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  }
  if (!(await rateLimit(`contact:${await clientKey()}`, 5, 3600))) return { ok: false, error: d.errors.rateLimited };
  const { website: _hp, ...row } = parsed.data;
  void _hp;
  // validated server-side, then inserted with the service role (the table has no public insert policy)
  const { error } = await createAdminClient().from("contact_messages").insert({ ...row, locale });
  if (error) return { ok: false, error: d.errors.generic };
  return { ok: true, message: d.contact.sent };
}
