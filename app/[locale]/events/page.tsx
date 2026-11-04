import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, EmptyState, PageHeader } from "@/components/ui/primitives";
import { EventCard } from "@/components/cards";
import { listEvents } from "@/features/content/queries";
export async function generateMetadata({ params }: PageProps<"/[locale]/events">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en");
  return { title: d.events.title, description: d.events.subtitle, alternates: { canonical: `/${locale}/events`, languages: { en: "/en/events", ar: "/ar/events" } } };
}
export default async function Events({ params }: PageProps<"/[locale]/events">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const [up, past] = await Promise.all([listEvents("upcoming"), listEvents("past", 12)]);
  return (
    <>
      <PageHeader title={d.events.title} subtitle={d.events.subtitle} />
      <Container className="space-y-12 py-10">
        <section><h2 className="mb-4 text-xl font-bold text-navy-900">{d.events.upcoming}</h2>{up.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{up.map((e) => <EventCard key={e.id} e={e} locale={locale} d={d} />)}</div> : <EmptyState title={d.events.empty} />}</section>
        {past.length > 0 && <section><h2 className="mb-4 text-xl font-bold text-navy-900">{d.events.past}</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{past.map((e) => <EventCard key={e.id} e={e} locale={locale} d={d} />)}</div></section>}
      </Container>
    </>
  );
}
