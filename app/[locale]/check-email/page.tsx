import Link from "next/link";
import { MailCheck } from "lucide-react";
import { isLocale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { AuthShell } from "@/components/layout/auth-shell";
export default async function CheckEmail({ params, searchParams }: PageProps<"/[locale]/check-email">) {
  const { locale: l } = await params; const locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const kind = (await searchParams).kind === "reset" ? "reset" : "verify";
  return (
    <AuthShell title={kind === "verify" ? d.auth.verifyTitle : d.auth.checkEmailTitle} footer={<Link href={`/${locale}/login`} className="font-semibold text-royal-600">{d.auth.signIn}</Link>}>
      <div className="flex gap-4 rounded-2xl bg-royal-50 p-5 text-navy-900"><MailCheck className="size-6 shrink-0 text-royal-600" aria-hidden /><p>{kind === "verify" ? d.auth.verifyBody : d.auth.checkEmailBody}</p></div>
    </AuthShell>
  );
}
