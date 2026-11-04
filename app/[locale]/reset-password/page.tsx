import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetForm } from "@/features/identity/ui/forms";
import { getViewer } from "@/lib/auth/session";
export default async function Reset({ params }: PageProps<"/[locale]/reset-password">) {
  const { locale: l } = await params; const locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  if (!(await getViewer())) redirect(`/${locale}/login?error=link`);
  return <AuthShell title={d.auth.resetTitle}><ResetForm /></AuthShell>;
}
