import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { AuthShell } from "@/components/layout/auth-shell";
import { Alert } from "@/components/ui/primitives";
import { LoginForm } from "@/features/identity/ui/forms";
import { getViewer } from "@/lib/auth/session";
import { homePath, safeNext } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export default async function Login({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale: l } = await params; const locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next, "") : "";
  const viewer = await getViewer();
  if (viewer && viewer.profile.account_status === "active") redirect(next || `/${locale}${homePath(viewer.roles)}`);
  const err = sp.error === "link" ? d.auth.invalidLink : sp.error === "suspended" ? d.auth.suspended : null;
  return (
    <AuthShell title={d.auth.loginTitle} subtitle={d.auth.loginSubtitle} footer={<>{d.auth.noAccount} <Link href={`/${locale}/register`} className="font-semibold text-royal-600">{d.nav.register}</Link></>}>
      {err && <Alert tone="danger" className="mb-4">{err}</Alert>}
      <LoginForm next={next || undefined} />
    </AuthShell>
  );
}
