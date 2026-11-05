import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/messages/en";
import type { Viewer } from "@/lib/auth/session";
import { homePath } from "@/lib/auth/roles";
import { ButtonLink } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";
import { MoreMenu } from "./more-menu";
import { signOutAction } from "@/features/identity/actions";

export function Logo({ locale, dict, compact }: { locale: Locale; dict: Dict; compact?: boolean }) {
  return (
    <Link href={`/${locale}`} className="flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label={dict.meta.fullName}>
      {/* Official logo, unaltered (background margin trimmed only). */}
      <Image src="/media/brand/logo-official-192.png" alt={dict.meta.fullName} width={96} height={96} priority className={`${compact ? "size-12" : "size-14 lg:size-16"} rounded-xl ring-1 ring-white/10`} />
    </Link>
  );
}

export function SiteHeader({ locale, dict, viewer, unread }: { locale: Locale; dict: Dict; viewer: Viewer | null; unread: number }) {
  const p = (s: string) => `/${locale}${s}`;
  const primary = [
    { href: p("/programs"), label: dict.nav.programs },
    { href: p("/labs"), label: dict.nav.labs },
    { href: p("/competitions"), label: dict.nav.competitions },
    { href: p("/events"), label: dict.nav.events },
    { href: p("/news"), label: dict.nav.news },
    { href: p("/about"), label: dict.nav.about },
  ];
  const secondary = [
    { href: p("/scholarships"), label: dict.nav.scholarships },
    { href: p("/schools"), label: dict.nav.schools },
    { href: p("/projects"), label: dict.nav.projects },
    { href: p("/gallery"), label: dict.nav.gallery },
    { href: p("/verify"), label: dict.nav.verify },
    { href: p("/contact"), label: dict.nav.contact },
  ];
  const home = viewer ? p(homePath(viewer.roles)) : null;
  const authButtons = viewer ? (
    <>
      <ButtonLink href={home!} variant="accent" size="sm">{dict.nav.myDashboard}</ButtonLink>
      <form action={signOutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button className="h-9 rounded-xl px-3 text-sm font-semibold text-white/80 hover:text-white" type="submit">{dict.nav.logout}</button>
      </form>
    </>
  ) : (
    <>
      <ButtonLink href={p("/login")} variant="onDark" size="sm">{dict.nav.login}</ButtonLink>
      <ButtonLink href={p("/register")} variant="accent" size="sm">{dict.nav.register}</ButtonLink>
    </>
  );
  return (
    <header className="sticky top-0 z-40 bg-navy-900/95 backdrop-blur supports-[backdrop-filter]:bg-navy-900/85">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Logo locale={locale} dict={dict} />
        <nav aria-label={dict.nav.mainNav} className="hidden items-center gap-1 lg:flex">
          {primary.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">{l.label}</Link>
          ))}
          <MoreMenu label={dict.nav.more} links={secondary} />
        </nav>
        <div className="flex items-center gap-2">
          {viewer && (
            <Link href={p("/dashboard/notifications")} className="relative grid size-10 place-items-center rounded-xl text-white ring-1 ring-white/20 hover:bg-white/10" aria-label={`${dict.nav.notifications}${unread ? ` (${unread})` : ""}`}>
              <Bell className="size-5" aria-hidden />
              {unread > 0 && <span className="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-cyan-500 px-1 text-[11px] font-bold text-navy-950">{unread > 9 ? "9+" : unread}</span>}
            </Link>
          )}
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <div className="hidden items-center gap-2 lg:flex">{authButtons}</div>
          <MobileMenu links={[...primary, ...secondary]} footer={<><LanguageSwitcher className="sm:hidden justify-center" />{authButtons}</>} />
        </div>
      </div>
    </header>
  );
}
