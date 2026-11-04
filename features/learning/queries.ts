import "server-only";
import { createClient } from "@/lib/supabase/server";

export type LessonFull = {
  id: string; module_id: string; course_id: string; title_en: string; title_ar: string; type: string;
  body_en: string | null; body_ar: string | null; video_url: string | null; duration_minutes: number | null; position: number;
  is_preview: boolean; completion_rule: string; assessment_id: string | null; assignment_id: string | null; lab_id: string | null;
};

export async function getLearnContext(slug: string, userId: string) {
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id, slug, title_en, title_ar, status, is_test_data").eq("slug", slug).maybeSingle();
  if (!course) return null;
  const [{ data: enrollment }, { data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("enrollments").select("id, status").eq("course_id", course.id).eq("student_id", userId).maybeSingle(),
    supabase.from("course_modules").select("id, title_en, title_ar, position").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select("id, module_id, course_id, title_en, title_ar, type, body_en, body_ar, video_url, duration_minutes, position, is_preview, completion_rule, assessment_id, assignment_id, lab_id").eq("course_id", course.id).eq("status", "published"),
    supabase.from("lesson_progress").select("lesson_id, status, video_percent, last_position_seconds").eq("course_id", course.id).eq("student_id", userId),
  ]);
  const ordered: LessonFull[] = [];
  for (const m of modules ?? []) ordered.push(...((lessons ?? []) as LessonFull[]).filter((l) => l.module_id === m.id).sort((a, b) => a.position - b.position));
  const prog = new Map((progress ?? []).map((p) => [p.lesson_id, p]));
  return { course, enrollment, modules: modules ?? [], lessons: ordered, progress: prog };
}
