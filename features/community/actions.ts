"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbError, fdOptional, fdString, formLocale, zodErrors, type ActionResult } from "@/lib/actions";
import { getDict } from "@/lib/i18n/dictionary";

/**
 * Students who completed a course, or verified parents of such a student, submit a review.
 * The database trigger re-checks eligibility, forces status 'pending' and sets the author role,
 * so nothing a client sends can publish a review or impersonate another learner.
 */
export async function submitReviewAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = z.object({
    course_id: z.string().uuid(), student_id: z.string().uuid(),
    rating: z.coerce.number().int().min(1, "number").max(5, "number"),
    body: z.string().trim().min(10, "min").max(1000, "max"),
  }).safeParse({ course_id: fdString(fd, "course_id"), student_id: fdString(fd, "student_id"), rating: fdString(fd, "rating"), body: fdString(fd, "body") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.errors.unauthorized };
  const row = { ...parsed.data, author_id: u.user.id, author_role: parsed.data.student_id === u.user.id ? "student" : "parent", locale };
  const { error } = await supabase.from("course_reviews").upsert(row, { onConflict: "course_id,author_id" });
  if (error) return { ok: false, error: dbError(error, locale) };
  const slug = fdOptional(fd, "slug");
  if (slug) revalidatePath(`/${locale}/programs/${slug}`);
  return { ok: true, message: d.community.reviewSubmitted };
}

const trainerProfile = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/, "slug"),
  display_name_en: z.string().trim().min(2, "min").max(120, "max"),
  display_name_ar: z.string().trim().min(2, "min").max(120, "max"),
  headline_en: z.string().trim().max(160, "max").nullable(), headline_ar: z.string().trim().max(160, "max").nullable(),
  bio_en: z.string().trim().max(2000, "max").nullable(), bio_ar: z.string().trim().max(2000, "max").nullable(),
  photo_url: z.string().trim().max(500).regex(/^(https:\/\/|\/)/, "url").nullable(),
  years_experience: z.preprocess((v) => (v === "" || v === null ? null : Number(v)), z.number().int().min(0, "number").max(60, "number").nullable()),
  specialties: z.array(z.enum(["robotics", "ai", "programming", "cybersecurity", "electronics", "embedded", "iot", "drones", "3d_printing", "stem"])).max(10),
});

/** A trainer saves their own public profile. The database forces it back to review on every change. */
export async function saveTrainerProfileAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const keys = ["slug", "display_name_en", "display_name_ar", "headline_en", "headline_ar", "bio_en", "bio_ar", "photo_url", "years_experience"];
  const parsed = trainerProfile.safeParse({ ...Object.fromEntries(keys.map((k) => [k, fdOptional(fd, k)])), specialties: fd.getAll("specialties").map(String) });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.errors.unauthorized };
  const status = fdString(fd, "intent") === "draft" ? "draft" : "pending";
  const { error } = await supabase.from("trainer_profiles").upsert({ ...parsed.data, trainer_id: u.user.id, status }, { onConflict: "trainer_id" });
  if (error) return { ok: false, error: dbError(error, locale) };
  revalidatePath(`/${locale}/trainer/profile`);
  return { ok: true, message: d.common.saved };
}
