import type { Metadata } from "next";
import Link from "next/link";
import { isLocale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/identity/ui/forms";

export const metadata: Metadata = { title: "Create account" };
export default async function Register({ params }: PageProps<"/[locale]/register">) {
  const { locale: l } = await params; const locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  return (
    <AuthShell title={d.auth.registerTitle} subtitle={d.auth.registerSubtitle} footer={<>{d.auth.haveAccount} <Link href={`/${locale}/login`} className="font-semibold text-royal-600">{d.auth.signIn}</Link></>}>
      <RegisterForm />
    </AuthShell>
  );
}
