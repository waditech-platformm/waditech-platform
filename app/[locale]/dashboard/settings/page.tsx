import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, Card } from "@/components/ui/primitives";
import { ProfileForm } from "@/features/identity/ui/forms";
import { ButtonLink } from "@/components/ui/button";
import { dashboardNav } from "../nav";
export default async function Settings({ params }: PageProps<"/[locale]/dashboard/settings">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireViewer(locale, "dashboard");
  return (
    <PortalShell title={d.dashboard.settings} nav={dashboardNav(locale, d, viewer.roles)}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-6"><h2 className="mb-4 font-bold text-navy-900">{d.dashboard.profile}</h2><ProfileForm fullName={viewer.profile.full_name} phone={viewer.profile.phone} preferred={viewer.profile.preferred_locale} /></Card>
        <Card className="space-y-3 p-6 text-sm">
          <p><span className="text-subtle">{d.common.email}:</span> <span className="font-latin font-semibold" dir="ltr">{viewer.email}</span></p>
          <div className="flex flex-wrap gap-1.5">{viewer.roles.map((r) => <Badge key={r} tone="blue">{d.enums.role[r]}</Badge>)}</div>
          <ButtonLink href={`/${locale}/forgot-password`} variant="secondary" size="sm">{d.auth.forgotTitle}</ButtonLink>
        </Card>
      </div>
    </PortalShell>
  );
}
