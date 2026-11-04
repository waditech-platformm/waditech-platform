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
import { signOutAction } from "@/features/identity/actions";

export function Logo({ locale, dict, compact }: { locale: Locale; dict: Dict; compact?: boolean }) {
  return (
    <Link href={`/${locale}`} className="flex items-center gap-2.5">
      <Image src="/media/brand/logo-square.png" alt={compact ? dict.meta.siteName : ""} width={40} height={40} priority className="size-10 rounded-xl ring-1 ring-cyan-500/40" />
      {!compact && (
        <span className="font-latin leading-none text-white">
          <span className="block text-[15px] font-extrabold tracking-wide">WADITECH</span>
          <span className="block text-[10px] font-semibold tracking-[0.32em] text-cyan-300">ACADEMY</span>
        </span>
      )}
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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo locale={locale} dict={dict} />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {primary.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white">{l.label}</Link>
          ))}
          <div className="group relative">
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white" aria-haspopup="true">{dict.nav.more} ▾</button>
            <div className="invisible absolute end-0 top-full z-50 w-56 translate-y-1 rounded-2xl bg-white p-2 opacity-0 shadow-[var(--shadow-lift)] ring-1 ring-line transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {secondary.map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-900 hover:bg-royal-50">{l.label}</Link>
              ))}
            </div>
          </div>
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
