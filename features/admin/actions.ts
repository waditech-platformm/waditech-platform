"use server";
/**
 * Admin / CMS server actions.
 * Every action runs with the SIGNED-IN USER's Supabase client, so Row-Level Security and the
 * database guard triggers remain the final authority even if an action is invoked directly.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbError, fdLines, fdOptional, fdString, formLocale, zodErrors, type ActionResult } from "@/lib/actions";
import { getDict } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import { storeUpload } from "@/server/storage";

const uuid = z.string().uuid();
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,120}$/, "slug");
const optUrl = z.string().trim().max(500).regex(/^(https:\/\/|\/)/, "url").nullable();
const optInt = (min: number, max: number) => z.preprocess((v) => (v === "" || v === null ? null : Number(v)), z.number().int().min(min, "number").max(max, "number").nullable());
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const ok = (locale: Locale, extra?: Partial<ActionResult>): ActionResult => ({ ok: true, message: getDict(locale).common.saved, ...extra });

async function ctx(fd: FormData) {
  const locale = formLocale(fd);
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  return { locale, supabase, uid: u.user?.id ?? null, d: getDict(locale) };
}

/* ------------------------------ COURSES ------------------------------ */
const courseSchema = z.object({
  title_en: z.string().trim().min(3, "min").max(160, "max"),
  title_ar: z.string().trim().min(2, "min").max(160, "max"),
  slug,
  summary_en: z.string().trim().max(400, "max").nullable(), summary_ar: z.string().trim().max(400, "max").nullable(),
  description_en: z.string().trim().max(8000, "max").nullable(), description_ar: z.string().trim().max(8000, "max").nullable(),
  category: z.enum(["robotics", "ai", "programming", "cybersecurity", "electronics", "embedded", "iot", "drones", "3d_printing", "stem"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  delivery_mode: z.enum(["in_person", "online", "hybrid"]),
  availability: z.enum(["open", "waitlist", "closed", "coming_soon"]),
  age_min: optInt(4, 99), age_max: optInt(4, 99), grade_min: optInt(1, 12), grade_max: optInt(1, 12), duration_weeks: optInt(1, 104), hours_total: optInt(1, 2000),
  price_amount: z.preprocess((v) => (v === "" ? 0 : Number(v)), z.number().min(0, "number").max(100000, "number")),
  currency: z.enum(["JOD", "USD"]),
  capacity: optInt(1, 10000),
  thumbnail_url: optUrl, cover_url: optUrl, preview_video_url: optUrl,
  program_id: uuid.nullable(),
}).refine((v) => v.age_min === null || v.age_max === null || v.age_max >= v.age_min, { path: ["age_max"], message: "number" })
  .refine((v) => v.grade_min === null || v.grade_max === null || v.grade_max >= v.grade_min, { path: ["grade_max"], message: "number" });

export async function saveCourseAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase, uid, d } = await ctx(fd);
  const raw = Object.fromEntries(["title_en", "title_ar", "slug", "summary_en", "summary_ar", "description_en", "description_ar", "category", "level", "delivery_mode", "availability", "age_min", "age_max", "grade_min", "grade_max", "duration_weeks", "hours_total", "price_amount", "currency", "capacity", "thumbnail_url", "cover_url", "preview_video_url", "program_id"].map((k) => [k, fdOptional(fd, k)]));
  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const row = { ...parsed.data, outcomes_en: fdLines(fd, "outcomes_en"), outcomes_ar: fdLines(fd, "outcomes_ar"), requirements_en: fdLines(fd, "requirements_en"), requirements_ar: fdLines(fd, "requirements_ar"), featured: bool(fd, "featured"), requires_approval: bool(fd, "requires_approval") };
  const id = fdString(fd, "id");
  if (id) {
    const { error } = await supabase.from("courses").update(row).eq("id", id);
    if (error) return { ok: false, error: dbError(error, locale) };
    revalidatePath(`/${locale}/programs`);
    return ok(locale);
  }
  const { data, error } = await supabase.from("courses").insert({ ...row, created_by: uid, status: "draft" }).select("id").single();
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true, message: d.common.saved, data: { redirect: `/${locale}/admin/courses/${data.id}` } };
}

export async function setCourseStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const status = z.enum(["draft", "published", "archived"]).safeParse(fdString(fd, "status"));
  if (!status.success) return { ok: false };
  const { error } = await supabase.from("courses").update({ status: status.data }).eq("id", fdString(fd, "id"));
  if (error) return { ok: false, error: dbError(error, locale) };
  revalidatePath(`/${locale}/programs`);
  return ok(locale);
}

export async function assignTrainerAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const { error } = await supabase.from("course_instructors").upsert({ course_id: fdString(fd, "course_id"), trainer_id: fdString(fd, "trainer_id"), is_lead: bool(fd, "is_lead") });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function removeTrainerAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const { error } = await supabase.from("course_instructors").delete().eq("course_id", fdString(fd, "course_id")).eq("trainer_id", fdString(fd, "trainer_id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}

/* ------------------------------ CURRICULUM ------------------------------ */
export async function saveModuleAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const parsed = z.object({ course_id: uuid, title_en: z.string().trim().min(2, "min").max(160), title_ar: z.string().trim().min(2, "min").max(160), position: optInt(0, 999) })
    .safeParse({ course_id: fdString(fd, "course_id"), title_en: fdString(fd, "title_en"), title_ar: fdString(fd, "title_ar"), position: fdString(fd, "position") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const id = fdString(fd, "id");
  const row = { ...parsed.data, position: parsed.data.position ?? 0 };
  const { error } = id ? await supabase.from("course_modules").update(row).eq("id", id) : await supabase.from("course_modules").insert(row);
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function deleteModuleAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const { error } = await supabase.from("course_modules").delete().eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}

const lessonSchema = z.object({
  module_id: uuid,
  title_en: z.string().trim().min(2, "min").max(160), title_ar: z.string().trim().min(2, "min").max(160),
  type: z.enum(["video", "text", "resource", "quiz", "assignment", "lab"]),
  body_en: z.string().max(20000, "max").nullable(), body_ar: z.string().max(20000, "max").nullable(),
  video_url: optUrl, duration_minutes: optInt(1, 600), position: optInt(0, 999),
  completion_rule: z.enum(["view", "video_90", "quiz_pass", "assignment_submitted", "manual"]),
  assessment_id: uuid.nullable(), assignment_id: uuid.nullable(), lab_id: uuid.nullable(),
}).superRefine((v, c) => {
  if (v.completion_rule === "quiz_pass" && !v.assessment_id) c.addIssue({ code: "custom", path: ["assessment_id"], message: "required" });
  if (v.completion_rule === "assignment_submitted" && !v.assignment_id) c.addIssue({ code: "custom", path: ["assignment_id"], message: "required" });
  if (v.completion_rule === "video_90" && !v.video_url) c.addIssue({ code: "custom", path: ["video_url"], message: "required" });
});
export async function saveLessonAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const keys = ["module_id", "title_en", "title_ar", "type", "body_en", "body_ar", "video_url", "duration_minutes", "position", "completion_rule", "assessment_id", "assignment_id", "lab_id"];
  const parsed = lessonSchema.safeParse(Object.fromEntries(keys.map((k) => [k, fdOptional(fd, k)])));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const row = { ...parsed.data, position: parsed.data.position ?? 0, is_preview: bool(fd, "is_preview") };
  const id = fdString(fd, "id");
  // course_id is derived from the module by a DB trigger
  const { error } = id ? await supabase.from("lessons").update(row).eq("id", id) : await supabase.from("lessons").insert({ ...row, course_id: fdString(fd, "course_id") });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function deleteLessonAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const { error } = await supabase.from("lessons").delete().eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}

/* ------------------------------ ASSESSMENTS ------------------------------ */
export async function saveAssessmentAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const parsed = z.object({ course_id: uuid, title_en: z.string().trim().min(2, "min").max(160), title_ar: z.string().trim().min(2, "min").max(160), pass_percent: optInt(0, 100), max_attempts: optInt(1, 50), time_limit_minutes: optInt(1, 600) })
    .safeParse({ course_id: fdString(fd, "course_id"), title_en: fdString(fd, "title_en"), title_ar: fdString(fd, "title_ar"), pass_percent: fdString(fd, "pass_percent"), max_attempts: fdString(fd, "max_attempts"), time_limit_minutes: fdString(fd, "time_limit_minutes") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const { error } = await supabase.from("assessments").insert({ ...parsed.data, pass_percent: parsed.data.pass_percent ?? 60 });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}

/** Options: one per line "English | Arabic". Mark correct options with a leading "*". Short answer: accepted answers, one per line. */
export async function saveQuestionAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase, d } = await ctx(fd);
  const parsed = z.object({ assessment_id: uuid, kind: z.enum(["single_choice", "multiple_choice", "short_answer"]), prompt_en: z.string().trim().min(3, "min").max(2000), prompt_ar: z.string().trim().min(2, "min").max(2000), points: optInt(0, 100), position: optInt(0, 999) })
    .safeParse({ assessment_id: fdString(fd, "assessment_id"), kind: fdString(fd, "kind"), prompt_en: fdString(fd, "prompt_en"), prompt_ar: fdString(fd, "prompt_ar"), points: fdString(fd, "points"), position: fdString(fd, "position") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const lines = fdLines(fd, "options");
  const opts = lines.map((line) => { const correct = line.startsWith("*"); const [en, ar] = line.replace(/^\*/, "").split("|").map((s) => s.trim()); return { correct, en, ar: ar || en }; });
  if (parsed.data.kind !== "short_answer") {
    if (opts.length < 2) return { ok: false, fieldErrors: { options: d.validation.min } };
    const nCorrect = opts.filter((o) => o.correct).length;
    if (nCorrect === 0 || (parsed.data.kind === "single_choice" && nCorrect !== 1)) return { ok: false, fieldErrors: { options: d.validation.required } };
  }
  const { data: q, error } = await supabase.from("questions").insert({ ...parsed.data, points: parsed.data.points ?? 1, position: parsed.data.position ?? 0 }).select("id").single();
  if (error) return { ok: false, error: dbError(error, locale) };
  let correctIds: string[] = [];
  if (parsed.data.kind !== "short_answer") {
    const { data: inserted, error: oerr } = await supabase.from("answer_options").insert(opts.map((o, i) => ({ question_id: q.id, label_en: o.en, label_ar: o.ar, position: i + 1 }))).select("id, position");
    if (oerr) return { ok: false, error: dbError(oerr, locale) };
    correctIds = (inserted ?? []).filter((o) => opts[o.position - 1]?.correct).map((o) => o.id);
  }
  const { error: kerr } = await supabase.from("question_keys").insert({ question_id: q.id, correct_option_ids: correctIds, accepted_answers: parsed.data.kind === "short_answer" ? fdLines(fd, "accepted") : [] });
  return kerr ? { ok: false, error: dbError(kerr, locale) } : ok(locale);
}
export async function deleteQuestionAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const { error } = await supabase.from("questions").delete().eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function saveAssignmentAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const parsed = z.object({ course_id: uuid, title_en: z.string().trim().min(2, "min").max(160), title_ar: z.string().trim().min(2, "min").max(160), instructions_en: z.string().max(10000).nullable(), instructions_ar: z.string().max(10000).nullable(), max_points: optInt(1, 1000), due_at: z.string().nullable() })
    .safeParse({ course_id: fdString(fd, "course_id"), title_en: fdString(fd, "title_en"), title_ar: fdString(fd, "title_ar"), instructions_en: fdOptional(fd, "instructions_en"), instructions_ar: fdOptional(fd, "instructions_ar"), max_points: fdString(fd, "max_points"), due_at: fdOptional(fd, "due_at") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const { error } = await supabase.from("assignments").insert({ ...parsed.data, max_points: parsed.data.max_points ?? 100, due_at: parsed.data.due_at ? new Date(parsed.data.due_at).toISOString() : null });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}

/* ------------------------------ NEWS ------------------------------ */
const articleSchema = z.object({
  slug, title_en: z.string().trim().min(3, "min").max(200), title_ar: z.string().trim().min(2, "min").max(200),
  excerpt_en: z.string().trim().max(400).nullable(), excerpt_ar: z.string().trim().max(400).nullable(),
  body_en: z.string().max(50000).nullable(), body_ar: z.string().max(50000).nullable(),
  cover_url: optUrl, category: z.enum(["news", "announcement", "article", "achievement"]),
  seo_title: z.string().trim().max(70).nullable(), seo_description: z.string().trim().max(170).nullable(),
  published_at: z.string().nullable(),
});
export async function saveArticleAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase, uid } = await ctx(fd);
  const keys = ["slug", "title_en", "title_ar", "excerpt_en", "excerpt_ar", "body_en", "body_ar", "cover_url", "category", "seo_title", "seo_description", "published_at"];
  const parsed = articleSchema.safeParse(Object.fromEntries(keys.map((k) => [k, fdOptional(fd, k)])));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const intent = fdString(fd, "intent"); // draft | publish
  const status = intent === "publish" ? "published" : intent === "archive" ? "archived" : "draft";
  const publishedAt = parsed.data.published_at ? new Date(parsed.data.published_at).toISOString() : status === "published" ? new Date().toISOString() : null;
  const row = { ...parsed.data, status, published_at: publishedAt, featured: bool(fd, "featured"), is_breaking: bool(fd, "is_breaking") };
  const id = fdString(fd, "id");
  const res = id ? await supabase.from("news_articles").update(row).eq("id", id).select("id").single() : await supabase.from("news_articles").insert({ ...row, author_id: uid }).select("id").single();
  if (res.error) return { ok: false, error: dbError(res.error, locale) };
  revalidatePath(`/${locale}/news`);
  return ok(locale, id ? {} : { data: { redirect: `/${locale}/admin/news/${res.data.id}` } });
}
export async function deleteArticleAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const { error } = await supabase.from("news_articles").delete().eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true, data: { redirect: `/${locale}/admin/news` } };
}

/* ------------------------------ EVENTS ------------------------------ */
const eventSchema = z.object({
  slug, title_en: z.string().trim().min(3, "min").max(200), title_ar: z.string().trim().min(2, "min").max(200),
  description_en: z.string().max(20000).nullable(), description_ar: z.string().max(20000).nullable(),
  starts_at: z.string().min(10, "required"), ends_at: z.string().nullable(),
  location_en: z.string().trim().max(200).nullable(), location_ar: z.string().trim().max(200).nullable(),
  capacity: optInt(1, 100000), cover_url: optUrl,
  status: z.enum(["draft", "published", "cancelled", "completed", "archived"]),
  course_id: uuid.nullable(),
});
export async function saveEventAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const keys = ["slug", "title_en", "title_ar", "description_en", "description_ar", "starts_at", "ends_at", "location_en", "location_ar", "capacity", "cover_url", "status", "course_id"];
  const parsed = eventSchema.safeParse(Object.fromEntries(keys.map((k) => [k, fdOptional(fd, k)])));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const row = { ...parsed.data, starts_at: new Date(parsed.data.starts_at).toISOString(), ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at).toISOString() : null, registration_open: bool(fd, "registration_open") };
  const id = fdString(fd, "id");
  const res = id ? await supabase.from("events").update(row).eq("id", id).select("id").single() : await supabase.from("events").insert(row).select("id").single();
  if (res.error) return { ok: false, error: dbError(res.error, locale) };
  revalidatePath(`/${locale}/events`);
  return ok(locale, id ? {} : { data: { redirect: `/${locale}/admin/events/${res.data.id}` } });
}

/* ------------------------------ COMPETITIONS / SCHOLARSHIPS / LABS ------------------------------ */
export async function saveCompetitionAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const parsed = z.object({
    slug, title_en: z.string().trim().min(3, "min").max(200), title_ar: z.string().trim().min(2, "min").max(200),
    description_en: z.string().max(10000).nullable(), description_ar: z.string().max(10000).nullable(),
    eligibility_en: z.string().max(2000).nullable(), eligibility_ar: z.string().max(2000).nullable(),
    team_min: optInt(1, 20), team_max: optInt(1, 20), registration_deadline: z.string().nullable(), event_date: z.string().nullable(),
    status: z.enum(["draft", "open", "closed", "completed", "archived"]), cover_url: optUrl,
  }).safeParse(Object.fromEntries(["slug", "title_en", "title_ar", "description_en", "description_ar", "eligibility_en", "eligibility_ar", "team_min", "team_max", "registration_deadline", "event_date", "status", "cover_url"].map((k) => [k, fdOptional(fd, k)])));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const row = { ...parsed.data, team_min: parsed.data.team_min ?? 1, team_max: parsed.data.team_max ?? 4, registration_deadline: parsed.data.registration_deadline ? new Date(parsed.data.registration_deadline).toISOString() : null };
  const id = fdString(fd, "id");
  const { error } = id ? await supabase.from("competitions").update(row).eq("id", id) : await supabase.from("competitions").insert(row);
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function setTeamStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const s = z.enum(["submitted", "accepted", "rejected", "withdrawn"]).safeParse(fdString(fd, "status"));
  if (!s.success) return { ok: false };
  const { error } = await supabase.from("competition_teams").update({ status: s.data }).eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function saveScholarshipAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const parsed = z.object({
    slug, title_en: z.string().trim().min(3, "min").max(200), title_ar: z.string().trim().min(2, "min").max(200),
    description_en: z.string().max(10000).nullable(), description_ar: z.string().max(10000).nullable(),
    criteria_en: z.string().max(4000).nullable(), criteria_ar: z.string().max(4000).nullable(),
    coverage_percent: optInt(1, 100), deadline: z.string().nullable(), status: z.enum(["draft", "open", "closed", "archived"]), course_id: uuid.nullable(),
  }).safeParse(Object.fromEntries(["slug", "title_en", "title_ar", "description_en", "description_ar", "criteria_en", "criteria_ar", "coverage_percent", "deadline", "status", "course_id"].map((k) => [k, fdOptional(fd, k)])));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const row = { ...parsed.data, deadline: parsed.data.deadline ? new Date(parsed.data.deadline).toISOString() : null };
  const id = fdString(fd, "id");
  const { error } = id ? await supabase.from("scholarships").update(row).eq("id", id) : await supabase.from("scholarships").insert(row);
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function reviewScholarshipAppAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const s = z.enum(["under_review", "approved", "rejected"]).safeParse(fdString(fd, "status"));
  if (!s.success) return { ok: false };
  const { error } = await supabase.from("scholarship_applications").update({ status: s.data, decision_note: fdOptional(fd, "decision_note") }).eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function saveLabAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const parsed = z.object({
    slug, category: z.enum(["robotics", "electronics", "programming", "ai", "cybersecurity", "3d_design"]),
    title_en: z.string().trim().min(3, "min").max(160), title_ar: z.string().trim().min(2, "min").max(160),
    summary_en: z.string().max(400).nullable(), summary_ar: z.string().max(400).nullable(),
    instructions_en: z.string().max(10000).nullable(), instructions_ar: z.string().max(10000).nullable(),
    provider: z.enum(["wokwi", "tinkercad", "python_online", "teachable_machine", "internal", "external_link"]),
    launch_url: z.string().trim().regex(/^https:\/\//, "url").nullable(), status: z.enum(["draft", "published", "archived"]),
  }).safeParse(Object.fromEntries(["slug", "category", "title_en", "title_ar", "summary_en", "summary_ar", "instructions_en", "instructions_ar", "provider", "launch_url", "status"].map((k) => [k, fdOptional(fd, k)])));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const id = fdString(fd, "id");
  const { error } = id ? await supabase.from("labs").update(parsed.data).eq("id", id) : await supabase.from("labs").insert(parsed.data);
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}

/* ------------------------------ USERS & ROLES ------------------------------ */
export async function grantRoleAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const role = z.enum(["super_admin", "admin", "trainer", "student", "parent", "school_coordinator"]).safeParse(fdString(fd, "role"));
  if (!role.success) return { ok: false };
  const { error } = await supabase.from("user_roles").insert({ user_id: fdString(fd, "user_id"), role: role.data });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function revokeRoleAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const { error } = await supabase.from("user_roles").delete().eq("user_id", fdString(fd, "user_id")).eq("role", fdString(fd, "role"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function setAccountStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const s = z.enum(["active", "suspended", "deactivated"]).safeParse(fdString(fd, "status"));
  if (!s.success) return { ok: false };
  const { error } = await supabase.rpc("admin_set_account_status", { p_user: fdString(fd, "user_id"), p_status: s.data });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}

/* ------------------------------ ENROLLMENTS / CERTIFICATES / FAMILIES / PROJECTS ------------------------------ */
export async function setEnrollmentStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const s = z.enum(["pending_payment", "pending_approval", "active", "completed", "cancelled", "refunded"]).safeParse(fdString(fd, "status"));
  if (!s.success) return { ok: false };
  const { error } = await supabase.from("enrollments").update({ status: s.data }).eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function adminEnrollAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase, d } = await ctx(fd);
  const email = z.string().email().safeParse(fdString(fd, "email"));
  if (!email.success) return { ok: false, fieldErrors: { email: d.validation.email } };
  const { data: uid, error: ferr } = await supabase.rpc("admin_find_user_by_email", { p_email: email.data });
  if (ferr) return { ok: false, error: dbError(ferr, locale) };
  if (!uid) return { ok: false, fieldErrors: { email: d.errors.notFound } };
  const { error } = await supabase.rpc("enroll_in_course", { p_course: fdString(fd, "course_id"), p_student: uid as string });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function revokeCertificateAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase, d } = await ctx(fd);
  const reason = fdString(fd, "reason");
  if (reason.length < 3) return { ok: false, fieldErrors: { reason: d.validation.required } };
  const { error } = await supabase.rpc("revoke_certificate", { p_id: fdString(fd, "id"), p_reason: reason });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function setLinkStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const s = z.enum(["verified", "rejected", "revoked"]).safeParse(fdString(fd, "status"));
  if (!s.success) return { ok: false };
  const { error } = await supabase.from("parent_student_links").update({ status: s.data }).eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function setProjectApprovalAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const s = z.enum(["approved", "rejected"]).safeParse(fdString(fd, "status"));
  if (!s.success) return { ok: false };
  const { error } = await supabase.from("student_projects").update({ approval_status: s.data }).eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}

/* ------------------------------ MEDIA ------------------------------ */
export async function uploadMediaAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase, uid, d } = await ctx(fd);
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: d.errors.forbidden };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, fieldErrors: { file: d.validation.required } };
  try {
    const stored = await storeUpload(file);
    const showsStudents = bool(fd, "shows_students");
    const { error } = await supabase.from("media_assets").insert({
      kind: stored.kind, url: stored.url, title_en: fdOptional(fd, "title_en"), title_ar: fdOptional(fd, "title_ar"),
      alt_en: fdOptional(fd, "alt_en"), alt_ar: fdOptional(fd, "alt_ar"), category: fdString(fd, "category") || "general",
      width: stored.width ?? null, height: stored.height ?? null, bytes: stored.bytes, mime_type: stored.mime,
      shows_students: showsStudents, consent_status: showsStudents ? "pending" : "not_required", is_public: false, uploaded_by: uid,
    });
    if (error) return { ok: false, error: dbError(error, locale) };
    return { ok: true, message: d.common.saved };
  } catch (e) {
    const m = (e as Error).message;
    return { ok: false, error: m === "unsupported_type" || m === "too_large" ? d.admin.uploadHelp : d.errors.generic };
  }
}
export async function updateMediaAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const consent = z.enum(["not_required", "pending", "granted", "denied"]).safeParse(fdString(fd, "consent_status"));
  if (!consent.success) return { ok: false };
  const { error } = await supabase.from("media_assets").update({ consent_status: consent.data, is_public: bool(fd, "is_public"), featured: bool(fd, "featured"), shows_students: bool(fd, "shows_students") }).eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function deleteMediaAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const { error } = await supabase.from("media_assets").delete().eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}

/* ------------------------------ PAYMENTS / MESSAGES / ORGS / ANNOUNCEMENTS ------------------------------ */
export async function refundOrderAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const amount = Number(fdString(fd, "amount"));
  // NOTE: for live HyperPay orders the provider refund (paymentType=RF) must succeed first: see docs/PAYMENTS.md
  const { error } = await supabase.rpc("mark_order_refunded", { p_order: fdString(fd, "id"), p_amount: amount, p_reference: fdOptional(fd, "reference") });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function setMessageStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const s = z.enum(["new", "in_progress", "closed"]).safeParse(fdString(fd, "status"));
  if (!s.success) return { ok: false };
  const { error } = await supabase.from("contact_messages").update({ status: s.data }).eq("id", fdString(fd, "id"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function saveOrganizationAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const parsed = z.object({ name: z.string().trim().min(2, "min").max(160), name_ar: z.string().trim().max(160).nullable(), slug, type: z.enum(["school", "university", "company", "community", "other"]), city: z.string().trim().max(80).nullable(), contact_email: z.string().email("email").nullable() })
    .safeParse(Object.fromEntries(["name", "name_ar", "slug", "type", "city", "contact_email"].map((k) => [k, fdOptional(fd, k)])));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const { error } = await supabase.from("organizations").insert(parsed.data);
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
/** List / unlist a school on the public site (header "Schools" menu and /schools). Admin-only: enforced by RLS + trigger (0011). */
export async function setOrgPublicAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const id = uuid.safeParse(fdString(fd, "organization_id"));
  if (!id.success) return { ok: false };
  const { error } = await supabase.from("organizations").update({ show_publicly: bool(fd, "show_publicly") }).eq("id", id.data);
  if (error) return { ok: false, error: dbError(error, locale) };
  revalidatePath(`/${locale}`, "layout");
  return ok(locale);
}
export async function addOrgMemberAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase, d } = await ctx(fd);
  const role = z.enum(["coordinator", "trainer", "student"]).safeParse(fdString(fd, "member_role"));
  if (!role.success) return { ok: false };
  const { data: uid } = await supabase.rpc("admin_find_user_by_email", { p_email: fdString(fd, "email") });
  if (!uid) return { ok: false, fieldErrors: { email: d.errors.notFound } };
  const { error } = await supabase.from("organization_members").insert({ organization_id: fdString(fd, "organization_id"), user_id: uid as string, member_role: role.data });
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function removeOrgMemberAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const { error } = await supabase.from("organization_members").delete().eq("organization_id", fdString(fd, "organization_id")).eq("user_id", fdString(fd, "user_id")).eq("member_role", fdString(fd, "member_role"));
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function broadcastAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase, d } = await ctx(fd);
  const parsed = z.object({ role: z.enum(["student", "parent", "trainer", "school_coordinator", "admin"]), title_en: z.string().trim().min(3, "min").max(160), title_ar: z.string().trim().min(2, "min").max(160), body_en: z.string().max(1000).nullable(), body_ar: z.string().max(1000).nullable(), link: z.string().regex(/^\/[a-z0-9/\-_?=&]*$/i, "url").nullable() })
    .safeParse(Object.fromEntries(["role", "title_en", "title_ar", "body_en", "body_ar", "link"].map((k) => [k, fdOptional(fd, k)])));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const { data, error } = await supabase.rpc("broadcast_announcement", { p_role: parsed.data.role, p_title_en: parsed.data.title_en, p_title_ar: parsed.data.title_ar, p_body_en: parsed.data.body_en, p_body_ar: parsed.data.body_ar, p_link: parsed.data.link });
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true, message: `${d.admin.sent}: ${data}` };
}

/* ------------------------------ TRAINER PROFILES / REVIEWS / LIBRARY ------------------------------ */
export async function setTrainerProfileStatusAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const s = z.object({ id: uuid, status: z.enum(["published", "hidden", "pending"]) }).safeParse({ id: fdString(fd, "id"), status: fdString(fd, "status") });
  if (!s.success) return { ok: false };
  const { error } = await supabase.from("trainer_profiles").update({ status: s.data.status }).eq("trainer_id", s.data.id);
  revalidatePath(`/${locale}/trainers`);
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function moderateReviewAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const s = z.object({ id: uuid, status: z.enum(["approved", "rejected", "pending"]), featured: z.boolean() })
    .safeParse({ id: fdString(fd, "id"), status: fdString(fd, "status"), featured: fdString(fd, "featured") === "true" });
  if (!s.success) return { ok: false };
  const { error } = await supabase.from("course_reviews").update({ status: s.data.status, featured: s.data.status === "approved" && s.data.featured }).eq("id", s.data.id);
  revalidatePath(`/${locale}`);
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
export async function saveResourceAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { locale, supabase } = await ctx(fd);
  const parsed = z.object({
    title_en: z.string().trim().min(3, "min").max(160, "max"), title_ar: z.string().trim().min(2, "min").max(160, "max"),
    description_en: z.string().trim().max(600, "max").nullable(), description_ar: z.string().trim().max(600, "max").nullable(),
    kind: z.enum(["pdf", "video", "worksheet", "link", "code"]),
    url: z.string().trim().max(500).regex(/^(https:\/\/|\/)/, "url"),
    category: z.enum(["robotics", "ai", "programming", "cybersecurity", "electronics", "embedded", "iot", "drones", "3d_printing", "stem"]).nullable(),
    grade_min: optInt(1, 12), grade_max: optInt(1, 12),
    course_id: uuid.nullable(),
    access: z.enum(["public", "registered", "enrolled"]),
    status: z.enum(["draft", "published", "archived"]),
    position: optInt(0, 9999),
  }).refine((v) => v.access !== "enrolled" || v.course_id, { path: ["course_id"], message: "required" })
    .refine((v) => v.grade_min === null || v.grade_max === null || v.grade_max >= v.grade_min, { path: ["grade_max"], message: "number" })
    .safeParse(Object.fromEntries(["title_en", "title_ar", "description_en", "description_ar", "kind", "url", "category", "grade_min", "grade_max", "course_id", "access", "status", "position"].map((k) => [k, fdOptional(fd, k)])));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const row = { ...parsed.data, position: parsed.data.position ?? 0 };
  const id = fdString(fd, "id");
  const { error } = id ? await supabase.from("resources").update(row).eq("id", id) : await supabase.from("resources").insert(row);
  revalidatePath(`/${locale}/library`);
  return error ? { ok: false, error: dbError(error, locale) } : ok(locale);
}
