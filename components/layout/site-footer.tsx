import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/messages/en";
import { Container } from "@/components/ui/primitives";
import { BrandLogo } from "@/components/brand-logo";
import { ContactForm } from "@/features/engagement/contact-form";
import { LocationMap, ACADEMY_LOCATION } from "./location-map";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dict }) {
  const p = (s: string) => `/${locale}${s}`;
  const f = dict.footer;
  const cols = [
    { title: f.explore, links: [[p("/programs"), dict.nav.programs], [p("/labs"), dict.nav.labs], [p("/competitions"), dict.nav.competitions], [p("/library"), dict.nav.library], [p("/scholarships"), dict.nav.scholarships], [p("/events"), dict.nav.events]] },
    { title: f.academy, links: [[p("/about"), dict.nav.about], [p("/trainers"), dict.nav.trainers], [p("/schools"), dict.nav.schools], [p("/news"), dict.nav.news], [p("/gallery"), dict.nav.gallery], [p("/projects"), dict.nav.projects]] },
    { title: f.support, links: [[p("/contact"), dict.nav.contact], [p("/verify"), dict.nav.verify], [p("/login"), dict.nav.login], [p("/register"), dict.nav.register]] },
  ];
  return (
    <footer className="border-t border-line bg-surface/80 text-muted backdrop-blur-[2px]">
      {/* Visit + message: where we are, and a way to reach us from any page */}
      <section aria-labelledby="footer-visit" className="border-b border-line">
        <Container className="grid gap-10 py-14 lg:grid-cols-2 lg:gap-14">
          <div className="wt-reveal">
            <h2 id="footer-visit" className="text-xl font-bold text-navy-900">{f.visitTitle}</h2>
            <p className="mt-2 flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-royal-600" aria-hidden />
              <span><span className="font-semibold text-navy-900">{dict.meta.fullName}</span><br />{f.madeIn}</span>
            </p>
            <div className="mt-5">
              <LocationMap locale={locale} labels={{ show: f.showMap, directions: f.directions, note: f.mapNote, title: f.mapTitle }} />
            </div>
            <a href={ACADEMY_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-royal-600 hover:underline">{f.openInMaps}</a>
          </div>
          <div className="wt-reveal">
            <h2 className="text-xl font-bold text-navy-900">{f.messageTitle}</h2>
            <p className="mt-2 text-sm">{f.messageBody}</p>
            <div className="mt-5 rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-6">
              <ContactForm compact idPrefix="footer-contact" />
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid grid-cols-2 gap-10 py-16 md:grid-cols-[1.6fr_repeat(3,1fr)]">
        <div className="col-span-2 md:col-span-1">
          <BrandLogo alt={dict.meta.fullName} className="h-auto w-60" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{f.about}</p>
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
          <p>© {new Date().getFullYear()} {dict.meta.fullName}. {f.rights}</p>
          <p className="flex gap-4"><span>{f.madeIn}</span><a href="https://waditech.co" className="hover:text-royal-700 font-latin" rel="noopener">waditech.co</a></p>
        </Container>
      </div>
    </footer>
  );
}
