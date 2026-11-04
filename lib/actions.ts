import "server-only";
import { z } from "zod";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";

export type ActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, unknown>;
};

export function formLocale(fd: FormData): Locale {
  const l = String(fd.get("locale") ?? "");
  return isLocale(l) ? l : "en";
}

/** Map database / auth errors to safe, localized messages (never leak internals). */
const KNOWN: Record<string, { en: string; ar: string }> = {
  "course is full": { en: "This course is full.", ar: "اكتمل العدد في هذه الدورة." },
  "course not available": { en: "This course is not available.", ar: "هذه الدورة غير متاحة." },
  "enrollment is not open for this course": { en: "Enrollment is not open for this course.", ar: "التسجيل غير متاح لهذه الدورة." },
  "only student accounts can be enrolled": { en: "Only student accounts can be enrolled.", ar: "يمكن تسجيل حسابات الطلاب فقط." },
  "you are not enrolled in this course": { en: "You are not enrolled in this course.", ar: "أنت غير مسجل في هذه الدورة." },
  "no attempts remaining": { en: "You have no attempts remaining.", ar: "لا توجد محاولات متبقية." },
  "attempt already submitted": { en: "This attempt was already submitted.", ar: "تم إرسال هذه المحاولة مسبقًا." },
  "registration is closed": { en: "Registration is closed.", ar: "التسجيل مغلق." },
  "event not available": { en: "This event is not available.", ar: "هذه الفعالية غير متاحة." },
  "applications are closed": { en: "Applications are closed.", ar: "باب التقديم مغلق." },
  "invalid discount code": { en: "That discount code is not valid.", ar: "رمز الخصم غير صالح." },
  "invalid code": { en: "That code was not found.", ar: "لم يتم العثور على هذا الرمز." },
  "student has not completed the course": { en: "The student has not completed all lessons yet.", ar: "لم يكمل الطالب جميع الدروس بعد." },
  "graded submissions cannot be changed": { en: "Graded submissions cannot be changed.", ar: "لا يمكن تعديل تسليم تم تقييمه." },
  "grade out of range": { en: "The grade is outside the allowed range.", ar: "العلامة خارج النطاق المسموح." },
  "student is not enrolled in this course": { en: "That student is not enrolled in this course.", ar: "هذا الطالب غير مسجل في الدورة." },
  "completion requirements not met": { en: "Completion requirements are not met yet.", ar: "لم تتحقق شروط الإكمال بعد." },
  "only super administrators can manage admin roles": { en: "Only super administrators can manage admin roles.", ar: "يدير المدراء العامون فقط صلاحيات الإدارة." },
  "you cannot remove your own administrator role": { en: "You cannot remove your own administrator role.", ar: "لا يمكنك سحب صلاحية الإدارة من نفسك." },
  "student profile has no name": { en: "The student profile has no name yet.", ar: "لا يوجد اسم في ملف الطالب." },
  "team size must be between": { en: "Team size is outside the allowed range.", ar: "حجم الفريق خارج النطاق المسموح." },
  "only administrators can change pricing, capacity or publishing": { en: "Only administrators can change pricing, capacity or publishing.", ar: "يغيّر المدراء فقط السعر والسعة والنشر." },
  duplicate: { en: "This already exists.", ar: "هذا موجود مسبقًا." },
};

export function dbError(err: { message?: string; code?: string } | null | undefined, locale: Locale): string {
  const d = getDict(locale);
  if (!err) return d.errors.generic;
  if (err.code === "42501") return d.errors.forbidden;
  if (err.code === "23505") return KNOWN.duplicate[locale];
  const msg = (err.message ?? "").toLowerCase();
  for (const [k, v] of Object.entries(KNOWN)) if (msg.startsWith(k)) return v[locale];
  if (process.env.APP_ENV !== "production") console.warn("[action] unmapped error", err);
  return d.errors.generic;
}

export function zodErrors(error: z.ZodError, locale: Locale): Record<string, string> {
  const d = getDict(locale).validation;
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (out[key]) continue;
    const custom = issue.message as keyof typeof d;
    out[key] = d[custom] ?? (issue.code === "too_small" ? d.min : issue.code === "too_big" ? d.max : d.required);
  }
  return out;
}

export const fdString = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
export const fdOptional = (fd: FormData, k: string) => fdString(fd, k) || null;
export const fdLines = (fd: FormData, k: string) => fdString(fd, k).split("\n").map((s) => s.trim()).filter(Boolean);
