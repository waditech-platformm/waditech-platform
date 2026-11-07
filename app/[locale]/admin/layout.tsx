import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { Container } from "@/components/ui/primitives";
import { PortalNav } from "@/components/layout/portal-nav";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale: l } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  // trainers may reach the course content editor only; every other admin page re-checks for admin
  const viewer = await requireViewer(locale, "trainer", `/${locale}/admin`);
  const a = (s: string) => `/${locale}/admin${s}`;
  const nav = isAdminRole(viewer.roles) ? [
    { href: a(""), label: d.admin.overview, exact: true }, { href: a("/analytics"), label: d.admin.analytics }, { href: a("/users"), label: d.admin.users }, { href: a("/courses"), label: d.admin.courses },
    { href: a("/enrollments"), label: d.admin.enrollments }, { href: a("/certificates"), label: d.admin.certificates }, { href: a("/news"), label: d.admin.news },
    { href: a("/events"), label: d.admin.events }, { href: a("/competitions"), label: d.admin.competitions }, { href: a("/scholarships"), label: d.admin.scholarships },
    { href: a("/labs"), label: d.admin.labs }, { href: a("/library"), label: d.admin.library }, { href: a("/trainers"), label: d.admin.trainerProfiles }, { href: a("/reviews"), label: d.admin.reviews }, { href: a("/media"), label: d.admin.media }, { href: a("/payments"), label: d.admin.payments },
    { href: a("/families"), label: d.admin.families }, { href: a("/projects"), label: d.admin.projects }, { href: a("/schools"), label: d.admin.schools },
    { href: a("/messages"), label: d.admin.messages }, { href: a("/notifications"), label: d.admin.notifications }, { href: a("/audit"), label: d.admin.audit },
  ] : [{ href: `/${locale}/trainer`, label: d.trainer.title }];
  return (
    <div>
      <div className="border-b border-line bg-paper"><Container className="pt-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-royal-600">{d.admin.title}</p><PortalNav items={nav} /></Container></div>
      <Container className="py-8">{children}</Container>
    </div>
  );
}
