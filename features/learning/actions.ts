"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbError, fdOptional, fdString, formLocale, zodErrors, type ActionResult } from "@/lib/actions";
import { getDict } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";

const uuid = z.string().uuid();

/** Called by the video player (not a form). Progress only ever moves forward in the DB. */
export async function trackVideoAction(lessonId: string, percent: number, position: number) {
  if (!uuid.safeParse(lessonId).success) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_lesson_progress", {
    p_lesson: lessonId, p_video_percent: Math.round(Math.max(0, Math.min(100, percent))), p_position: Math.round(Math.max(0, position)),
  });
  return { ok: !error, video_percent: (data as { video_percent?: number } | null)?.video_percent ?? 0 };
}

export async function completeLessonAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const lesson = uuid.safeParse(fdString(fd, "lesson_id"));
  if (!lesson.success) return { ok: false, error: getDict(locale).errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_lesson", { p_lesson: lesson.data });
  if (error) return { ok: false, error: dbError(error, locale) };
  const next = fdString(fd, "next");
  return { ok: true, data: next.startsWith(`/${locale}/learn/`) ? { redirect: next } : undefined };
}

const noteSchema = z.object({ lesson_id: uuid, body: z.string().trim().min(1, "required").max(5000, "max") });
export async function saveNoteAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const parsed = noteSchema.safeParse({ lesson_id: fdString(fd, "lesson_id"), body: fdString(fd, "body") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: getDict(locale).errors.unauthorized };
  const { error } = await supabase.from("lesson_notes").insert({ ...parsed.data, student_id: u.user.id });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true };
}
export async function deleteNoteAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const id = uuid.safeParse(fdString(fd, "note_id"));
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_notes").delete().eq("id", id.data);
  return error ? { ok: false, error: dbError(error, locale) } : { ok: true };
}

export async function startAttemptAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const a = uuid.safeParse(fdString(fd, "assessment_id"));
  if (!a.success) return { ok: false, error: getDict(locale).errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_attempt", { p_assessment: a.data });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true };
}

/** Answers are collected from the form; grading happens ONLY in the database (submit_attempt). */
export async function submitAttemptAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const attempt = uuid.safeParse(fdString(fd, "attempt_id"));
  if (!attempt.success) return { ok: false, error: getDict(locale).errors.generic };
  const qids = fd.getAll("question_ids").map(String).filter((q) => uuid.safeParse(q).success);
  const answers = qids.map((q) => ({
    question_id: q,
    option_ids: fd.getAll(`q_${q}`).map(String).filter((o) => uuid.safeParse(o).success),
    text: fdString(fd, `t_${q}`).slice(0, 4000) || null,
  }));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_attempt", { p_attempt: attempt.data, p_answers: answers });
  if (error) return { ok: false, error: dbError(error, locale) };
  const r = data as { score_percent: number; passed: boolean | null; status: string; assessment_id: string };
  if (r.passed) {
    const { data: lesson } = await supabase.from("lessons").select("id").eq("assessment_id", r.assessment_id).maybeSingle();
    if (lesson) await supabase.rpc("complete_lesson", { p_lesson: lesson.id });
  }
  return { ok: true, data: { score: r.score_percent, passed: r.passed, status: r.status } };
}

const submissionSchema = z.object({
  assignment_id: uuid,
  body_text: z.string().trim().max(20000, "max").nullable(),
  link_url: z.string().trim().url("url").regex(/^https?:\/\//i, "url").nullable(),
}).refine((v) => v.body_text || v.link_url, { path: ["body_text"], message: "required" });

export async function submitAssignmentAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = submissionSchema.safeParse({ assignment_id: fdString(fd, "assignment_id"), body_text: fdOptional(fd, "body_text"), link_url: fdOptional(fd, "link_url") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.errors.unauthorized };
  const { data: a } = await supabase.from("assignments").select("course_id").eq("id", parsed.data.assignment_id).single();
  if (!a) return { ok: false, error: d.errors.notFound };
  const row = { ...parsed.data, student_id: u.user.id, course_id: a.course_id };
  const { data: existing } = await supabase.from("submissions").select("id").eq("assignment_id", parsed.data.assignment_id).eq("student_id", u.user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("submissions").update({ body_text: row.body_text, link_url: row.link_url }).eq("id", existing.id)
    : await supabase.from("submissions").insert(row);
  if (error) return { ok: false, error: dbError(error, locale) };
  // the lesson tied to this assignment can now be completed
  const { data: lesson } = await supabase.from("lessons").select("id").eq("assignment_id", parsed.data.assignment_id).maybeSingle();
  if (lesson) await supabase.rpc("complete_lesson", { p_lesson: lesson.id });
  return { ok: true, message: d.assignment.submitted };
}

const labSchema = z.object({ lab_id: uuid, project_url: z.string().trim().url("url").regex(/^https:\/\//i, "url"), notes: z.string().trim().max(3000, "max").nullable() });
export async function submitLabAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = labSchema.safeParse({ lab_id: fdString(fd, "lab_id"), project_url: fdString(fd, "project_url"), notes: fdOptional(fd, "notes") });
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.errors.unauthorized };
  const { error } = await supabase.from("lab_submissions").insert({ ...parsed.data, student_id: u.user.id });
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true, message: d.labs.submitted };
}

export async function revalidateLearn(locale: Locale, slug: string) {
  revalidatePath(`/${locale}/learn/${slug}`, "layout");
}
