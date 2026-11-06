import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/messages/en";
import { Container } from "@/components/ui/primitives";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dict }) {
  const p = (s: string) => `/${locale}${s}`;
  const cols = [
    { title: dict.footer.explore, links: [[p("/programs"), dict.nav.programs], [p("/labs"), dict.nav.labs], [p("/competitions"), dict.nav.competitions], [p("/library"), dict.nav.library], [p("/scholarships"), dict.nav.scholarships], [p("/events"), dict.nav.events]] },
    { title: dict.footer.academy, links: [[p("/about"), dict.nav.about], [p("/trainers"), dict.nav.trainers], [p("/schools"), dict.nav.schools], [p("/news"), dict.nav.news], [p("/gallery"), dict.nav.gallery], [p("/projects"), dict.nav.projects]] },
    { title: dict.footer.support, links: [[p("/contact"), dict.nav.contact], [p("/verify"), dict.nav.verify], [p("/login"), dict.nav.login], [p("/register"), dict.nav.register]] },
  ];
  return (
    <footer className="border-t border-line bg-surface text-muted">
      <Container className="grid grid-cols-2 gap-10 py-16 md:grid-cols-[1.6fr_repeat(3,1fr)]">
        <div className="col-span-2 md:col-span-1">
          <Image src="/media/brand/logo-original-480.png" alt={dict.meta.fullName} width={480} height={320} className="h-auto w-60" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{dict.footer.about}</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-4 text-sm font-semibold text-navy-900">{c.title}</p>
            <ul className="space-y-2.5 text-sm">
              {c.links.map(([href, label]) => <li key={href}><Link href={href} className="transition-colors hover:text-royal-700">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {dict.meta.fullName}. {dict.footer.rights}</p>
          <p className="flex gap-4"><span>{dict.footer.madeIn}</span><a href="https://waditech.co" className="hover:text-royal-700 font-latin" rel="noopener">waditech.co</a></p>
        </Container>
      </div>
    </footer>
  );
}
