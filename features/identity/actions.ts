"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getDict } from "@/lib/i18n/dictionary";
import { formLocale, zodErrors, type ActionResult } from "@/lib/actions";
import { homePath, safeNext, type Role } from "@/lib/auth/roles";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { emailSchema, loginSchema, profileSchema, registerSchema, resetSchema } from "./schemas";

const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

export async function registerAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = registerSchema.safeParse(obj(fd));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  if (!(await rateLimit(`register:${await clientKey()}`, 5, 600))) return { ok: false, error: d.auth.rateLimited };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      // account_type is a REQUEST only; the database trigger allows just "student" or "parent"
      data: { full_name: parsed.data.full_name, account_type: parsed.data.account_type, locale },
    },
  });
  if (error && !/already registered/i.test(error.message)) {
    console.warn("[register]", error.message);
    return { ok: false, error: /rate/i.test(error.message) ? d.auth.rateLimited : d.errors.generic };
  }
  // same response for new & existing emails (no account enumeration)
  return { ok: true, data: { redirect: `/${locale}/check-email?kind=verify` } };
}

export async function loginAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = loginSchema.safeParse(obj(fd));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const key = await clientKey();
  if (!(await rateLimit(`login:${key}`, 10, 300)) || !(await rateLimit(`login:${parsed.data.email}`, 8, 300)))
    return { ok: false, error: d.auth.rateLimited };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, error: d.auth.invalidCredentials };
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("account_status, preferred_locale").eq("id", data.user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
  ]);
  if (profile?.account_status !== "active") {
    await supabase.auth.signOut();
    return { ok: false, error: d.auth.suspended };
  }
  const home = `/${locale}${homePath((roles ?? []).map((r) => r.role as Role))}`;
  return { ok: true, data: { redirect: safeNext(fd.get("next") as string, home) } };
}

export async function signOutAction(fd: FormData) {
  const locale = formLocale(fd);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

export async function forgotPasswordAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = emailSchema.safeParse(obj(fd));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  if (!(await rateLimit(`forgot:${await clientKey()}`, 5, 600))) return { ok: false, error: d.auth.rateLimited };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/${locale}/reset-password` });
  return { ok: true, data: { redirect: `/${locale}/check-email?kind=reset` } };
}

export async function resetPasswordAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = resetSchema.safeParse(obj(fd));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.auth.invalidLink };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: /different/i.test(error.message) ? d.validation.password : d.errors.generic };
  return { ok: true, message: d.auth.resetDone, data: { redirect: `/${locale}/dashboard?reset=1` } };
}

export async function updateProfileAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = formLocale(fd);
  const d = getDict(locale);
  const parsed = profileSchema.safeParse(obj(fd));
  if (!parsed.success) return { ok: false, fieldErrors: zodErrors(parsed.error, locale) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, error: d.errors.unauthorized };
  const { error } = await supabase.from("profiles").update({
    full_name: parsed.data.full_name, phone: parsed.data.phone || null, preferred_locale: parsed.data.preferred_locale,
  }).eq("id", u.user.id);
  if (error) return { ok: false, error: d.errors.generic };
  return { ok: true, message: d.common.saved };
}
