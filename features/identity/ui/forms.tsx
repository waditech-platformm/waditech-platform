"use client";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { ActionForm, SubmitButton, useFieldError } from "@/components/ui/action-form";
import { Input, Label, Select } from "@/components/ui/form";
import { loginAction, registerAction, forgotPasswordAction, resetPasswordAction, updateProfileAction } from "../actions";

function F({ name, label, type = "text", autoComplete, hint, defaultValue, required = true }: { name: string; label: string; type?: string; autoComplete?: string; hint?: string; defaultValue?: string; required?: boolean }) {
  const err = useFieldError(name);
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} autoComplete={autoComplete} defaultValue={defaultValue} required={required}
        aria-invalid={!!err} aria-describedby={err ? `${name}-error` : hint ? `${name}-hint` : undefined} dir={type === "email" || type === "password" ? "ltr" : undefined} />
      {hint && !err && <p id={`${name}-hint`} className="mt-1 text-xs text-subtle">{hint}</p>}
      {err && <p id={`${name}-error`} className="mt-1 text-xs font-medium text-danger">{err}</p>}
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { dict: d, locale } = useI18n();
  return (
    <ActionForm action={loginAction} className="space-y-4" refreshOnSuccess={false}>
      {next && <input type="hidden" name="next" value={next} />}
      <F name="email" label={d.auth.email} type="email" autoComplete="email" />
      <F name="password" label={d.auth.password} type="password" autoComplete="current-password" />
      <div className="flex justify-end"><Link href={`/${locale}/forgot-password`} className="text-sm font-semibold text-royal-600">{d.auth.forgot}</Link></div>
      <SubmitButton size="lg" className="w-full" pendingLabel={d.auth.signingIn}>{d.auth.signIn}</SubmitButton>
    </ActionForm>
  );
}

export function RegisterForm() {
  const { dict: d, locale } = useI18n();
  const termsErr = useFieldError("terms");
  return (
    <ActionForm action={registerAction} className="space-y-4" refreshOnSuccess={false}>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-navy-900">{d.auth.accountType}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["student", "parent"] as const).map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 rounded-xl p-3 text-sm font-semibold ring-1 ring-line has-[:checked]:bg-royal-50 has-[:checked]:ring-royal-500">
              <input type="radio" name="account_type" value={t} defaultChecked={t === "student"} className="accent-royal-600" />{d.auth[t]}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-subtle">{d.auth.studentAgeNote}</p>
      </fieldset>
      <F name="full_name" label={d.auth.fullName} autoComplete="name" />
      <F name="email" label={d.auth.email} type="email" autoComplete="email" />
      <F name="password" label={d.auth.password} type="password" autoComplete="new-password" hint={d.auth.passwordHint} />
      <F name="confirm" label={d.auth.confirmPassword} type="password" autoComplete="new-password" />
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-royal-600" aria-invalid={!!termsErr} />
        <span>{d.auth.agree}</span>
      </label>
      {termsErr && <p className="text-xs font-medium text-danger">{termsErr}</p>}
      <SubmitButton size="lg" className="w-full" pendingLabel={d.auth.creating}>{d.auth.createAccount}</SubmitButton>
      <p className="text-center text-xs text-subtle">{d.auth.privilegedNote}</p>
    </ActionForm>
  );
}

export function ForgotForm() {
  const { dict: d } = useI18n();
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-4" refreshOnSuccess={false}>
      <F name="email" label={d.auth.email} type="email" autoComplete="email" />
      <SubmitButton size="lg" className="w-full" pendingLabel={d.common.loading}>{d.auth.sendLink}</SubmitButton>
    </ActionForm>
  );
}
export function ResetForm() {
  const { dict: d } = useI18n();
  return (
    <ActionForm action={resetPasswordAction} className="space-y-4" refreshOnSuccess={false}>
      <F name="password" label={d.auth.password} type="password" autoComplete="new-password" hint={d.auth.passwordHint} />
      <F name="confirm" label={d.auth.confirmPassword} type="password" autoComplete="new-password" />
      <SubmitButton size="lg" className="w-full" pendingLabel={d.common.saving}>{d.auth.resetSubmit}</SubmitButton>
    </ActionForm>
  );
}
export function ProfileForm({ fullName, phone, preferred }: { fullName: string; phone: string | null; preferred: string }) {
  const { dict: d } = useI18n();
  return (
    <ActionForm action={updateProfileAction} className="grid gap-4 sm:grid-cols-2">
      <F name="full_name" label={d.auth.fullName} defaultValue={fullName} autoComplete="name" />
      <F name="phone" label={`${d.common.phone} (${d.common.optional})`} type="tel" defaultValue={phone ?? ""} required={false} />
      <div>
        <Label htmlFor="preferred_locale">{d.dashboard.preferredLanguage}</Label>
        <Select id="preferred_locale" name="preferred_locale" defaultValue={preferred}><option value="en">English</option><option value="ar">العربية</option></Select>
      </div>
      <div className="flex items-end"><SubmitButton pendingLabel={d.common.saving}>{d.common.save}</SubmitButton></div>
    </ActionForm>
  );
}
