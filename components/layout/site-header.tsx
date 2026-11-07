import Link from "next/link";
import { ArrowRight, Bell, School } from "lucide-react";
import type { NavTrack, PartnerSchool } from "@/features/navigation/queries";
import { NavFlyout } from "./nav-flyout";
import { SchoolList } from "./school-list";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/messages/en";
import type { Viewer } from "@/lib/auth/session";
import { homePath } from "@/lib/auth/roles";
import { ButtonLink } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { MoreMenu } from "./more-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { signOutAction } from "@/features/identity/actions";

export function Logo({ locale, dict, compact }: { locale: Locale; dict: Dict; compact?: boolean }) {
  return (
    <Link href={`/${locale}`} className="flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label={dict.meta.fullName}>
      {/* Official logo, the full supplied image, unaltered. */}
      <BrandLogo alt={dict.meta.fullName} priority className={`${compact ? "h-12" : "h-14"} w-auto`} />
    </Link>
  );
}

function ProgramsPanel({ locale, dict, tracks }: { locale: Locale; dict: Dict; tracks: NavTrack[] }) {
  const p = (s: string) => `/${locale}${s}`;
  const cats = dict.enums.category as Record<string, string>;
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-JO");
  const total = tracks.reduce((n, t) => n + t.total, 0);
  return (
    <div>
      <div className="grid gap-x-6 gap-y-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.slice(0, 6).map((t) => (
          <div key={t.key} className="min-w-0">
            <Link href={p(`/programs?category=${t.key}`)} className="text-sm font-bold text-navy-900 hover:text-royal-600">{cats[t.key] ?? t.key}</Link>
            <ul className="mt-2 space-y-1">
              {t.programs.map((c) => (
                <li key={c.slug}>
                  <Link href={p(`/programs/${c.slug}`)} className="block truncate rounded-md py-0.5 text-sm text-muted hover:text-royal-600">{locale === "ar" ? c.title_ar : c.title_en}</Link>
                </li>
              ))}
              {t.total > t.programs.length && (
                <li><Link href={p(`/programs?category=${t.key}`)} className="text-xs font-semibold text-royal-600 hover:underline">{dict.nav.moreInTrack.replace("{n}", nf.format(t.total - t.programs.length))}</Link></li>
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line bg-surface px-6 py-3.5">
        <Link href={p("/programs")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600 hover:underline">
          {dict.nav.allProgramsN.replace("{n}", nf.format(total))}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
        <Link href={p("/labs")} className="text-sm font-medium text-muted hover:text-navy-900">{dict.nav.labs}</Link>
      </div>
    </div>
  );
}

function SchoolsPanel({ locale, dict, schools }: { locale: Locale; dict: Dict; schools: PartnerSchool[] }) {
  const p = (s: string) => `/${locale}${s}`;
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-JO");
  const n = dict.nav;
  return (
    <div className="grid sm:grid-cols-[1fr_15rem]">
      <div className="min-w-0 p-6">
        <p className="text-sm font-bold text-navy-900">{n.partnerSchools}</p>
        {schools.length > 0 ? (
          <>
            <p className="mt-1 text-xs text-subtle">{schools.length === 1 ? n.partnerSchools1 : n.partnerSchoolsN.replace("{n}", nf.format(schools.length))}</p>
            <SchoolList schools={schools} locale={locale} filterLabel={n.filterSchools} emptyLabel={n.noSchoolMatch} demoLabel={dict.common.demoBadge} />
          </>
        ) : (
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{n.partnerSchoolsEmpty}</p>
        )}
      </div>
      <div className="flex flex-col justify-between gap-4 bg-deep-950 p-6 text-white">
        <School className="size-7 text-cyan-300" aria-hidden />
        <div>
          <p className="text-base font-bold leading-snug">{n.bringToSchool}</p>
          <Link href={p("/schools")} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:underline">
            {n.schoolsProgramLink}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({ locale, dict, viewer, unread, tracks = [], schools = [] }: { locale: Locale; dict: Dict; viewer: Viewer | null; unread: number; tracks?: NavTrack[]; schools?: PartnerSchool[] }) {
  const p = (s: string) => `/${locale}${s}`;
  const primary = [
    { href: p("/programs"), label: dict.nav.programs },
    { href: p("/schools"), label: dict.nav.schools },
    { href: p("/labs"), label: dict.nav.labs },
    { href: p("/competitions"), label: dict.nav.competitions },
    { href: p("/about"), label: dict.nav.about },
  ];
  const secondary = [
    { href: p("/events"), label: dict.nav.events },
    { href: p("/news"), label: dict.nav.news },
    { href: p("/scholarships"), label: dict.nav.scholarships },
    { href: p("/trainers"), label: dict.nav.trainers },
    { href: p("/library"), label: dict.nav.library },
    { href: p("/projects"), label: dict.nav.projects },
    { href: p("/gallery"), label: dict.nav.gallery },
    { href: p("/verify"), label: dict.nav.verify },
    { href: p("/contact"), label: dict.nav.contact },
  ];
  const home = viewer ? p(homePath(viewer.roles)) : null;
  const authButtons = viewer ? (
    <>
      <ButtonLink href={home!} size="sm">{dict.nav.myDashboard}</ButtonLink>
      <form action={signOutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button className="h-9 rounded-xl px-3 text-sm font-semibold text-muted hover:text-navy-900" type="submit">{dict.nav.logout}</button>
      </form>
    </>
  ) : (
    <>
      <ButtonLink href={p("/login")} variant="ghost" size="sm">{dict.nav.login}</ButtonLink>
      <ButtonLink href={p("/register")} size="sm">{dict.nav.register}</ButtonLink>
    </>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo locale={locale} dict={dict} />
        <nav aria-label={dict.nav.mainNav} className="hidden items-center gap-1 lg:flex">
          {primary.map((l) =>
            l.href === p("/programs") && tracks.length > 0 ? (
              <NavFlyout key={l.href} href={l.href} label={l.label} toggleLabel={dict.nav.showProgramsMenu}>
                <ProgramsPanel locale={locale} dict={dict} tracks={tracks} />
              </NavFlyout>
            ) : l.href === p("/schools") ? (
              <NavFlyout key={l.href} href={l.href} label={l.label} toggleLabel={dict.nav.showSchoolsMenu} width="w-[min(40rem,calc(100vw-2rem))]">
                <SchoolsPanel locale={locale} dict={dict} schools={schools} />
              </NavFlyout>
            ) : (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-[15px] font-medium text-navy-900/80 transition-colors hover:bg-surface hover:text-navy-900">{l.label}</Link>
            ),
          )}
          <MoreMenu label={dict.nav.more} links={secondary} />
        </nav>
        <div className="flex items-center gap-2">
          {viewer && (
            <Link href={p("/dashboard/notifications")} className="relative grid size-10 place-items-center rounded-xl text-navy-900 ring-1 ring-line hover:bg-surface" aria-label={`${dict.nav.notifications}${unread ? ` (${unread})` : ""}`}>
              <Bell className="size-5" aria-hidden />
              {unread > 0 && <span className="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-cyan-500 px-1 text-[11px] font-bold text-navy-950">{unread > 9 ? "9+" : unread}</span>}
            </Link>
          )}
          <ThemeToggle toDark={dict.common.themeDark} toLight={dict.common.themeLight} />
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <div className="hidden items-center gap-2 lg:flex">{authButtons}</div>
          <MobileMenu links={[...primary, ...secondary]} footer={<><LanguageSwitcher className="sm:hidden justify-center" />{authButtons}</>} />
        </div>
      </div>
    </header>
  );
}
