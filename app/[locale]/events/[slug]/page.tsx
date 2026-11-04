import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { isLocale, pick, formatDateTime, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Badge, Card, Container, DemoBadge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Markdown } from "@/components/markdown";
import { eventSeats, getEvent } from "@/features/content/queries";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cancelEventRegistrationAction, registerEventAction } from "@/features/engagement/actions";

export async function generateMetadata({ params }: PageProps<"/[locale]/events/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params; const l: Locale = isLocale(locale) ? locale : "en";
  const e = await getEvent(slug); if (!e) return {};
  return { title: pick(e, "title", l), description: pick(e, "description", l).slice(0, 160), alternates: { canonical: `/${l}/events/${slug}` } };
}
export default async function EventPage({ params }: PageProps<"/[locale]/events/[slug]">) {
  const { locale: l, slug } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const e = await getEvent(slug);
  if (!e || e.status === "draft" || e.status === "archived") notFound();
  const [seats, viewer] = await Promise.all([eventSeats(e.id), getViewer()]);
  let reg: { id: string; status: string } | null = null;
  if (viewer) reg = (await (await createClient()).from("event_registrations").select("id, status").eq("event_id", e.id).eq("user_id", viewer.id).maybeSingle()).data;
  const upcoming = new Date(e.starts_at) > new Date();
  const full = e.capacity !== null && seats.registered >= e.capacity;
  const open = e.status === "published" && e.registration_open && upcoming;
  const ld = { "@context": "https://schema.org", "@type": "Event", name: e.title_en, startDate: e.starts_at, endDate: e.ends_at, eventStatus: e.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled", location: { "@type": "Place", name: e.location_en } };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <section className="bg-neural text-white">
        <Container className="grid gap-8 py-10 lg:grid-cols-[1.2fr_1fr] lg:py-14">
          <div>
            <Link href={`/${locale}/events`} className="text-sm text-white/70 hover:text-white">← {d.events.title}</Link>
            <div className="mt-4 flex gap-2"><Badge tone={e.status === "cancelled" ? "danger" : "cyan"}>{d.events.status[e.status as keyof typeof d.events.status]}</Badge><DemoBadge show={e.is_test_data} label={d.common.demoBadge} /></div>
            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{pick(e, "title", locale)}</h1>
            <dl className="mt-6 space-y-2 text-white/85">
              <div className="flex items-center gap-2"><CalendarDays className="size-5 text-cyan-300" aria-hidden /><dt className="sr-only">{d.events.when}</dt><dd>{formatDateTime(e.starts_at, locale)}{e.ends_at && ` – ${formatDateTime(e.ends_at, locale)}`}</dd></div>
              {pick(e, "location", locale) && <div className="flex items-center gap-2"><MapPin className="size-5 text-cyan-300" aria-hidden /><dt className="sr-only">{d.events.location}</dt><dd>{pick(e, "location", locale)}</dd></div>}
              {e.capacity && <div className="flex items-center gap-2"><Users className="size-5 text-cyan-300" aria-hidden /><dd>{seats.registered} / {e.capacity} {d.events.seats}</dd></div>}
            </dl>
          </div>
          {e.cover_url && <div className="relative aspect-[16/10] overflow-hidden rounded-3xl"><Image src={e.cover_url} alt="" fill priority sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" /></div>}
        </Container>
      </section>
      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
        <Card className="p-6"><Markdown source={pick(e, "description", locale)} /></Card>
        <Card className="h-fit p-6">
          {reg && reg.status !== "cancelled" ? (
            <div className="space-y-3">
              <Badge tone={reg.status === "registered" ? "success" : "warning"} className="py-1 text-sm">{reg.status === "registered" ? d.events.registered : d.events.waitlisted}</Badge>
              {upcoming && <ActionForm action={cancelEventRegistrationAction}><input type="hidden" name="registration_id" value={reg.id} /><SubmitButton variant="secondary" size="sm">{d.events.cancelRegistration}</SubmitButton></ActionForm>}
            </div>
          ) : !open ? <p className="text-sm text-muted">{d.events.closed}</p>
            : !viewer ? <ButtonLink href={`/${locale}/login?next=/${locale}/events/${e.slug}`} className="w-full">{d.common.signInToContinue}</ButtonLink>
            : <ActionForm action={registerEventAction}><input type="hidden" name="event_id" value={e.id} /><SubmitButton className="w-full" size="lg" pendingLabel={d.common.loading}>{full ? d.events.full : d.events.register}</SubmitButton></ActionForm>}
        </Card>
      </Container>
    </>
  );
}
