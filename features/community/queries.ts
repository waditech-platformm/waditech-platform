import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PublicTrainer = {
  trainer_id: string; slug: string; display_name_en: string; display_name_ar: string; headline_en: string | null; headline_ar: string | null;
  bio_en: string | null; bio_ar: string | null; specialties: string[]; photo_url: string | null; years_experience: number | null;
  courses: number; learners: number; is_test_data: boolean;
};
export type CourseTrainerProfile = { trainer_id: string; slug: string; display_name_en: string; display_name_ar: string; headline_en: string | null; headline_ar: string | null; photo_url: string | null; is_lead: boolean };
export type PublicReview = {
  id: string; course_id: string; course_title_en: string; course_title_ar: string; course_slug: string; author_first_name: string;
  author_role: "student" | "parent"; rating: number; body: string; locale: string; created_at: string; is_test_data: boolean;
};
export type CourseStats = { course_id: string; learners: number; rating: number | null; reviews: number };
export type LibraryItem = {
  id: string; title_en: string; title_ar: string; description_en: string | null; description_ar: string | null; kind: string; url: string | null;
  category: string | null; grade_min: number | null; grade_max: number | null; course_id: string | null; course_slug: string | null;
  course_title_en: string | null; course_title_ar: string | null; access: "public" | "registered" | "enrolled"; unlocked: boolean; is_test_data: boolean;
};

export async function listTrainers() {
  const s = await createClient();
  return ((await s.rpc("public_trainers")).data ?? []) as PublicTrainer[];
}
export async function getTrainer(slug: string) {
  const s = await createClient();
  return (((await s.rpc("public_trainers", { p_slug: slug })).data ?? []) as PublicTrainer[])[0] ?? null;
}
export async function trainerCourseIds(trainerId: string) {
  const s = await createClient();
  return ((await s.rpc("trainer_courses", { p_trainer: trainerId })).data ?? []) as string[];
}
export async function courseTrainerProfiles(courseId: string) {
  const s = await createClient();
  return ((await s.rpc("course_trainer_profiles", { p_course: courseId })).data ?? []) as CourseTrainerProfile[];
}
export async function publicReviews(courseId: string | null, limit = 12) {
  const s = await createClient();
  return ((await s.rpc("public_reviews", { p_course: courseId, p_limit: limit })).data ?? []) as PublicReview[];
}
/** Learners and approved-review rating per published course, keyed by course id. */
export async function courseStats() {
  const s = await createClient();
  const rows = ((await s.rpc("public_course_stats")).data ?? []) as CourseStats[];
  return new Map(rows.map((r) => [r.course_id, { ...r, rating: r.rating === null ? null : Number(r.rating) }]));
}
export async function libraryItems(f: { category?: string; grade?: number; kind?: string } = {}) {
  const s = await createClient();
  return ((await s.rpc("library_items", { p_category: f.category ?? null, p_grade: f.grade ?? null, p_kind: f.kind ?? null })).data ?? []) as LibraryItem[];
}
