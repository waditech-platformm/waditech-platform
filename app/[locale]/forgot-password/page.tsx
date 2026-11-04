import Link from "next/link";
import { isLocale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotForm } from "@/features/identity/ui/forms";
export default async function Forgot({ params }: PageProps<"/[locale]/forgot-password">) {
  const { locale: l } = await params; const locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  return <AuthShell title={d.auth.forgotTitle} subtitle={d.auth.forgotSubtitle} footer={<Link href={`/${locale}/login`} className="font-semibold text-royal-600">{d.auth.signIn}</Link>}><ForgotForm /></AuthShell>;
}
