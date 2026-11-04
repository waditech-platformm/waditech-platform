"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbError, fdOptional, fdString, formLocale, zodErrors, type ActionResult } from "@/lib/actions";
import { getDict } from "@/lib/i18n/dictionary";

const uuid = z.string().uuid();

export async function gradeSubmissionAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = z.object({ id: uuid, grade_points: z.coerce.number().min(0, "number").max(1000, "number"), feedback: z.string().max(4000, "max").nullable() })
    .safeParse({ id: fdString(fd, "id"), grade_points: fdString(fd, "grade_points"), feedback: fdOptional(fd, "feedback") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data, error } = await supabase.from("submissions").update({ grade_points: parsed.data.grade_points, feedback: parsed.data.feedback }).eq("id", parsed.data.id).select("id");
  if (error) return { ok: false, error: dbError(error, locale) };
  if (!data?.length) return { ok: false, error: d.errors.forbidden };
  return { ok: true, message: d.common.saved };
}

export async function reviewAttemptAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const id = uuid.safeParse(fdString(fd, "attempt_id"));
  if (!id.success) return { ok: false };
  const points: Record<string, number> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("p_") && uuid.safeParse(k.slice(2)).success && v !== "") points[k.slice(2)] = Number(v);
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_attempt", { p_attempt: id.data, p_points: points, p_feedback: fdOptional(fd, "feedback") });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true, message: getDict(locale).common.saved };
}

export async function createSessionAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const parsed = z.object({ course_id: uuid, title: z.string().trim().max(120).nullable(), starts_at: z.string().min(10, "required"), location: z.string().trim().max(120).nullable() })
    .safeParse({ course_id: fdString(fd, "course_id"), title: fdOptional(fd, "title"), starts_at: fdString(fd, "starts_at"), location: fdOptional(fd, "location") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const starts = new Date(parsed.data.starts_at);
  if (isNaN(starts.getTime())) return { ok: false, fieldErrors: { starts_at: getDict(locale).validation.required } };
  const supabase = await createClient();
  const { error } = await supabase.from("class_sessions").insert({ ...parsed.data, starts_at: starts.toISOString(), ends_at: new Date(starts.getTime() + 2 * 3600e3).toISOString() });
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true };
}

export async function markAttendanceAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const session = uuid.safeParse(fdString(fd, "session_id"));
  if (!session.success) return { ok: false };
  const rows: { session_id: string; student_id: string; course_id: string; status: string }[] = [];
  const course = fdString(fd, "course_id");
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("s_") && uuid.safeParse(k.slice(2)).success && ["present", "absent", "late", "excused"].includes(String(v)))
      rows.push({ session_id: session.data, student_id: k.slice(2), course_id: course, status: String(v) });
  }
  if (!rows.length) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "session_id,student_id" });
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true, message: getDict(locale).common.saved };
}

export async function completeEnrollmentAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").update({ status: "completed" }).eq("id", fdString(fd, "enrollment_id"));
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true };
}

export async function issueCertificateAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const id = uuid.safeParse(fdString(fd, "enrollment_id"));
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_certificate", { p_enrollment: id.data });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true, message: `${getDict(locale).trainer.certificateIssued}: ${(data as { certificate_number: string }).certificate_number}` };
}

export async function staffCompleteLessonAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const supabase = await createClient();
  const { error } = await supabase.rpc("staff_complete_lesson", { p_lesson: fdString(fd, "lesson_id"), p_student: fdString(fd, "student_id") });
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true };
}

export async function labFeedbackAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const supabase = await createClient();
  const { data, error } = await supabase.from("lab_submissions").update({ feedback: fdString(fd, "feedback").slice(0, 3000) }).eq("id", fdString(fd, "id")).select("id");
  if (error) return { ok: false, error: dbError(error, locale) };
  return data?.length ? { ok: true, message: getDict(locale).common.saved } : { ok: false, error: getDict(locale).errors.forbidden };
}
