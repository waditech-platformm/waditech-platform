"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbError, formLocale, fdString, type ActionResult } from "@/lib/actions";
import { getDict } from "@/lib/i18n/dictionary";

const uuid = z.string().uuid();

export async function enrollAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const course = uuid.safeParse(fdString(fd, "course_id"));
  const student = fdString(fd, "student_id");
  if (!course.success) return { ok: false, error: d.errors.generic };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.errors.unauthorized };
  const { data: enrollment, error } = await supabase.rpc("enroll_in_course", {
    p_course: course.data,
    p_student: student && uuid.safeParse(student).success ? student : null,
  });
  if (error) return { ok: false, error: dbError(error, locale) };
  const e = enrollment as { id: string; status: string };
  const { data: c } = await supabase.from("courses").select("slug").eq("id", course.data).single();
  revalidatePath(`/${locale}/programs/${c?.slug}`);
  if (e.status === "pending_payment") {
    const { data: order, error: oerr } = await supabase.rpc("create_order_for_enrollment", { p_enrollment: e.id });
    if (oerr) return { ok: false, error: dbError(oerr, locale) };
    // Server-side redirect: the revalidated page would otherwise unmount the form before a client redirect runs.
    redirect(`/${locale}/checkout/${(order as { id: string }).id}`);
  }
  if (e.status === "active" && !student) redirect(`/${locale}/learn/${c?.slug}`);
  return { ok: true, message: d.enums.enrollment[e.status as keyof typeof d.enums.enrollment] };
}

export async function cancelEnrollmentAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const id = uuid.safeParse(fdString(fd, "enrollment_id"));
  if (!id.success) return { ok: false, error: getDict(locale).errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").update({ status: "cancelled" }).eq("id", id.data);
  if (error) return { ok: false, error: dbError(error, locale) };
  return { ok: true };
}
