import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Course = {
  id: string; slug: string; program_id: string | null;
  title_en: string; title_ar: string; summary_en: string | null; summary_ar: string | null;
  description_en: string | null; description_ar: string | null;
  category: string; level: string; delivery_mode: string; availability: string;
  age_min: number | null; age_max: number | null; grade_min: number | null; grade_max: number | null; duration_weeks: number | null; hours_total: number | null;
  price_amount: number; currency: string; capacity: number | null; requires_approval: boolean;
  thumbnail_url: string | null; cover_url: string | null; preview_video_url: string | null;
  outcomes_en: string[]; outcomes_ar: string[]; requirements_en: string[]; requirements_ar: string[];
  faqs: { q_en: string; q_ar: string; a_en: string; a_ar: string }[];
  featured: boolean; status: string; is_test_data: boolean;
};
const COURSE_COLS = "id, slug, program_id, title_en, title_ar, summary_en, summary_ar, description_en, description_ar, category, level, delivery_mode, availability, age_min, age_max, grade_min, grade_max, duration_weeks, hours_total, price_amount, currency, capacity, requires_approval, thumbnail_url, cover_url, preview_video_url, outcomes_en, outcomes_ar, requirements_en, requirements_ar, faqs, featured, status, is_test_data";

export type CourseFilters = { category?: string; level?: string; mode?: string; availability?: string; age?: number; grade?: number; q?: string };

export async function listCourses(f: CourseFilters = {}) {
  const supabase = await createClient();
  let q = supabase.from("courses").select(COURSE_COLS).eq("status", "published").order("featured", { ascending: false }).order("title_en");
  if (f.category) q = q.eq("category", f.category);
  if (f.level) q = q.eq("level", f.level);
  if (f.mode) q = q.eq("delivery_mode", f.mode);
  if (f.availability) q = q.eq("availability", f.availability);
  if (f.age) q = q.lte("age_min", f.age).gte("age_max", f.age);
  if (f.grade) q = q.lte("grade_min", f.grade).gte("grade_max", f.grade);
  if (f.q) {
    const s = f.q.replace(/[%,()]/g, " ").slice(0, 60);
    q = q.or(`title_en.ilike.%${s}%,title_ar.ilike.%${s}%,summary_en.ilike.%${s}%,summary_ar.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Course[];
}

export async function featuredCourses(limit = 6) {
  const supabase = await createClient();
  // featured first, then fill the grid with other published courses so layouts stay balanced
  const { data } = await supabase.from("courses").select(COURSE_COLS).eq("status", "published").order("featured", { ascending: false }).order("availability").limit(limit);
  return (data ?? []) as unknown as Course[];
}

export async function getCourseBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select(COURSE_COLS).eq("slug", slug).maybeSingle();
  return (data ?? null) as unknown as Course | null;
}

export type OutlineRow = { lesson_id: string; module_id: string; title_en: string; title_ar: string; type: string; duration_minutes: number | null; lesson_position: number; is_preview: boolean };
export async function getCourseOutline(courseId: string) {
  const supabase = await createClient();
  const [{ data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("course_modules").select("id, title_en, title_ar, position").eq("course_id", courseId).order("position"),
    supabase.rpc("course_outline", { p_course: courseId }),
  ]);
  const rows = (lessons ?? []) as OutlineRow[];
  return (modules ?? []).map((m) => ({ ...m, lessons: rows.filter((l) => l.module_id === m.id).sort((a, b) => a.lesson_position - b.lesson_position) }));
}

export async function getCourseTrainers(courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("course_trainers", { p_course: courseId });
  return (data ?? []) as { trainer_id: string; full_name: string; is_lead: boolean }[];
}

export async function seatsTaken(courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("course_seats", { p_course: courseId });
  return (data as number | null) ?? 0;
}
