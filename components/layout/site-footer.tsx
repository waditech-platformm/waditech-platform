import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/messages/en";
import { Container } from "@/components/ui/primitives";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dict }) {
  const p = (s: string) => `/${locale}${s}`;
  const cols = [
    { title: dict.footer.explore, links: [[p("/programs"), dict.nav.programs], [p("/labs"), dict.nav.labs], [p("/competitions"), dict.nav.competitions], [p("/scholarships"), dict.nav.scholarships]] },
    { title: dict.footer.academy, links: [[p("/about"), dict.nav.about], [p("/news"), dict.nav.news], [p("/events"), dict.nav.events], [p("/gallery"), dict.nav.gallery], [p("/projects"), dict.nav.projects]] },
    { title: dict.footer.support, links: [[p("/contact"), dict.nav.contact], [p("/schools"), dict.nav.schools], [p("/verify"), dict.nav.verify], [p("/login"), dict.nav.login]] },
  ];
  return (
    <footer className="bg-navy-950 text-white/75">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Image src="/media/brand/logo-mark-sm.png" alt={dict.meta.fullName} width={200} height={150} className="h-auto w-44" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{dict.footer.about}</p>
          <p className="mt-3 text-xs font-bold tracking-[0.25em] text-cyan-300 font-latin">LEARN · BUILD · INNOVATE</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-3 text-sm font-bold text-white">{c.title}</p>
            <ul className="space-y-2 text-sm">
              {c.links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-cyan-300">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {dict.meta.fullName}. {dict.footer.rights}</p>
          <p className="flex gap-4"><span>{dict.footer.madeIn}</span><a href="https://waditech.co" className="hover:text-cyan-300 font-latin" rel="noopener">waditech.co</a></p>
        </Container>
      </div>
    </footer>
  );
}
