import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Hammer, Lightbulb, School, Trophy, Users } from "lucide-react";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { NewsCard, EventCard, LabCard, priceLabel } from "@/components/cards";
import { VideoTile } from "@/components/video-tile";
import { listCourses } from "@/features/catalog/queries";
import { listCompetitions, listEvents, listLabs, listMedia, listNews, publicProjects } from "@/features/content/queries";
import { ProgramFinder, type FinderCourse } from "@/features/home/program-finder";
import { AGE_BANDS } from "@/features/home/age-bands";
import { LabFigure } from "@/features/home/lab-figure";

/** Section heading used across the homepage: calm, large type, one optional link. */
function Heading({ title, subtitle, href, linkLabel, id }: { title: string; subtitle?: string; href?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h2 id={id} className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 text-lg text-muted">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-royal-600 underline-offset-4 hover:underline">
          {linkLabel}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default async function Home({ params, searchParams }: PageProps<"/[locale]">) {
  const { locale: l } = await params;
  const sp = await searchParams;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const h = d.home;
  const p = (s: string) => `/${locale}${s}`;
  const [courses, labs, events, news, comps, projects, videos, photos] = await Promise.all([
    listCourses(), listLabs(), listEvents("upcoming", 3), listNews({ limit: 3 }), listCompetitions(8),
    publicProjects(4), listMedia({ kind: "video", limit: 6 }), listMedia({ kind: "image", limit: 12 }),
  ]);

  const cats = d.enums.category as Record<string, string>;
  const finderCourses: FinderCourse[] = courses.map((c) => ({
    id: c.id, slug: c.slug, title: pick(c, "title", locale), category: c.category, categoryLabel: cats[c.category] ?? c.category,
    age_min: c.age_min, age_max: c.age_max, price: priceLabel(c, locale, d), thumb: c.thumbnail_url ?? c.cover_url ?? null,
  }));
  const tracks = [...new Set(courses.map((c) => c.category))].map((k) => ({ key: k, label: cats[k] ?? k }));
  const q = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const initialAge = AGE_BANDS.some((b) => b.key === q(sp.age)) ? q(sp.age) : undefined;
  const initialTrack = tracks.some((t) => t.key === q(sp.track)) ? q(sp.track) : undefined;

  const arrow = <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;
  const journey = [
    { icon: Lightbulb, t: h.journey1Title, b: h.journey1Body, img: photos[0] },
    { icon: Hammer, t: h.journey2Title, b: h.journey2Body, img: photos[1] },
    { icon: Trophy, t: h.journey3Title, b: h.journey3Body, img: photos[2] },
  ];
  const bento = photos.slice(3, 8);
  const parentPhoto = photos[8];
  const labAlt = locale === "ar" ? "مدخل مختبر الروبوتات للأطفال في وادي تك" : "Entrance of the WadiTech kids robotics lab";

  return (
    <>
      {/* ---------- HERO: large calm type + program finder ---------- */}
      <section className="relative overflow-hidden bg-white">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_80%_0%,rgb(32_201_207/0.12),transparent_70%),radial-gradient(50%_50%_at_10%_10%,rgb(36_86_211/0.08),transparent_70%)]" />
        <Container className="relative grid grid-cols-1 items-center gap-12 py-14 sm:py-20 [&>*]:min-w-0 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
          <div>
            <p className="wt-rise text-sm font-semibold text-royal-600" style={{ "--i": 0 } as React.CSSProperties}>{h.heroEyebrow}</p>
            <h1 className="wt-rise mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight text-navy-900 sm:text-5xl lg:text-6xl" style={{ "--i": 1 } as React.CSSProperties}>{h.heroTitle}</h1>
            <p className="wt-rise mt-5 flex flex-wrap gap-x-3 text-xl font-bold text-cyan-600 sm:text-2xl" style={{ "--i": 2 } as React.CSSProperties}>{h.heroSubtitle}</p>
            <p className="wt-rise mt-5 max-w-xl text-lg leading-relaxed text-muted" style={{ "--i": 3 } as React.CSSProperties}>{h.heroBody}</p>
            <div className="wt-rise mt-8 flex flex-wrap gap-3" style={{ "--i": 4 } as React.CSSProperties}>
              <ButtonLink href={p("/programs")} size="lg">{h.ctaExplore}{arrow}</ButtonLink>
              <ButtonLink href={p("/about")} variant="secondary" size="lg">{h.ctaDiscover}</ButtonLink>
            </div>
          </div>
          <div className="wt-rise" style={{ "--i": 3 } as React.CSSProperties}>
            <ProgramFinder locale={locale} courses={finderCourses} tracks={tracks} initialAge={initialAge} initialTrack={initialTrack}
              labels={{ title: h.finderTitle, age: h.finderAge, track: h.finderTrack, all: h.finderAll, m0: h.matches0, m1: h.matches1, m2: h.matches2, mN: h.matchesN, seeMatching: h.seeMatching,
                ages: { "6-9": h.age69, "10-13": h.age1013, "14-18": h.age1418 } }} />
          </div>
        </Container>
      </section>

      {/* ---------- THE LAB (annotated supplied image) ---------- */}
      <section className="bg-white pb-16 sm:pb-24">
        <Container>
          <LabFigure alt={labAlt} labels={[h.callout1, h.callout2, h.callout3, h.callout4]} caption={h.labCaption} logoAlt={d.meta.fullName} />
        </Container>
      </section>

      {/* ---------- TRUST: real competitions only ---------- */}
      {comps.length > 0 && (
        <section className="border-y border-line bg-surface py-8">
          <Container className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <h2 className="shrink-0 text-sm font-semibold text-muted">{h.trustTitle}</h2>
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {comps.map((c) => (
                <li key={c.id}><Link href={p(`/competitions/${c.slug}`)} className="inline-flex items-center gap-2 font-semibold text-navy-900 hover:text-royal-600"><Trophy className="size-4 text-cyan-600" aria-hidden />{pick(c, "title", locale)}</Link></li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* ---------- LEARNING JOURNEY ---------- */}
      <section className="py-16 sm:py-24">
        <Container>
          <Heading title={h.journeyTitle} subtitle={h.journeySubtitle} />
          <ol className="grid gap-6 md:grid-cols-3">
            {journey.map((j, i) => (
              <li key={j.t} className="overflow-hidden rounded-[24px] bg-white ring-1 ring-line">
                <div className="relative aspect-[4/3] bg-navy-900">
                  {j.img && <Image src={j.img.url} alt={pick(j.img, "alt", locale)} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover" />}
                </div>
                <div className="p-6">
                  <p className="flex items-center gap-3 text-sm font-semibold text-royal-600">
                    <span className="grid size-8 place-items-center rounded-full bg-royal-50 font-latin">{i + 1}</span><j.icon className="size-4" aria-hidden />
                  </p>
                  <h3 className="mt-3 text-xl font-bold text-navy-900">{j.t}</h3>
                  <p className="mt-2 text-muted">{j.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---------- ARENA: filmstrip + bento of consented media ---------- */}
      {(videos.length > 0 || bento.length > 0) && (
        <section className="bg-navy-950 py-16 text-white sm:py-24">
          <Container>
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{h.arenaTitle}</h2>
                <p className="mt-3 text-lg text-white/75">{h.arenaSubtitle}</p>
              </div>
              <Link href={p("/gallery")} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-cyan-300 underline-offset-4 hover:underline">{d.nav.gallery}{arrow}</Link>
            </div>
            {videos.length > 0 && (
              <ul tabIndex={0} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:mx-0 sm:px-0" aria-label={h.arenaTitle}>
                {videos.map((v) => (
                  <li key={v.id} className="relative aspect-[9/16] w-52 shrink-0 snap-start overflow-hidden rounded-2xl bg-navy-900 sm:w-60">
                    <VideoTile src={v.url} poster={v.poster_url} label={pick(v, "alt", locale)} className="absolute inset-0 size-full object-cover" />
                  </li>
                ))}
              </ul>
            )}
            {bento.length > 0 && (
              <div className="mt-6 grid auto-rows-[160px] grid-cols-2 gap-4 sm:auto-rows-[200px] md:grid-cols-4">
                {bento.map((m, i) => (
                  <div key={m.id} className={`relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                    <Image src={m.url} alt={pick(m, "alt", locale)} fill sizes={i === 0 ? "(min-width:768px) 50vw, 100vw" : "(min-width:768px) 25vw, 50vw"} className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </Container>
        </section>
      )}

      {/* ---------- STUDENT PROJECTS ---------- */}
      {projects.length > 0 && (
        <section className="py-16 sm:py-24">
          <Container>
            <Heading title={h.projectsTitle} subtitle={h.projectsSubtitle} href={p("/projects")} linkLabel={d.common.viewAll} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {projects.map((pr) => (
                <article key={pr.id} className="overflow-hidden rounded-[24px] bg-white ring-1 ring-line">
                  <div className="relative aspect-[4/3] bg-navy-900">{pr.cover_url && <Image src={pr.cover_url} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />}</div>
                  <div className="p-5">
                    <h3 className="font-bold text-navy-900">{pr.title}</h3>
                    <p className="mt-1 text-sm text-subtle">{d.projects.by} {pr.student_first_name}</p>
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ---------- PARENTS + SCHOOLS ---------- */}
      <section className="bg-white py-16 sm:py-24">
        <Container className="grid grid-cols-1 gap-6 [&>*]:min-w-0 lg:grid-cols-2">
          <div className="flex flex-col overflow-hidden rounded-[28px] bg-surface ring-1 ring-line">
            {parentPhoto && (
              <div className="relative aspect-[16/9]"><Image src={parentPhoto.url} alt={pick(parentPhoto, "alt", locale)} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /></div>
            )}
            <div className="flex-1 p-8 sm:p-10">
            <Users className="size-8 text-royal-600" aria-hidden />
            <h2 className="mt-5 text-2xl font-extrabold text-navy-900 sm:text-3xl">{h.parentsTitle}</h2>
            <p className="mt-3 text-muted">{h.parentsBody}</p>
            <ul className="mt-6 space-y-3">
              {[h.parents1, h.parents2, h.parents3, h.parents4].map((x) => (
                <li key={x} className="flex gap-3 text-navy-900"><Check className="mt-0.5 size-5 shrink-0 text-cyan-600" aria-hidden />{x}</li>
              ))}
            </ul>
            <div className="mt-8"><ButtonLink href={p("/register")}>{h.parentsCta}{arrow}</ButtonLink></div>
          </div>
          </div>
          <div className="flex flex-col overflow-hidden rounded-[28px] bg-navy-900 text-white">
            <div className="relative aspect-[16/9]">
              <Image src="/media/brand/lab-classroom.webp" alt={locale === "ar" ? "محطات البرمجة والروبوتات داخل مختبر وادي تك" : "Coding and robotics workstations inside the WadiTech lab"} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col p-8 sm:p-10">
              <School className="size-8 text-cyan-300" aria-hidden />
              <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">{h.schoolsTitle}</h2>
              <p className="mt-3 text-white/80">{h.schoolsBody}</p>
              <ul className="mt-6 space-y-3">
                {h.schoolsPoints.split(" · ").map((x) => (
                  <li key={x} className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-cyan-300" aria-hidden />{x}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={p("/contact?topic=schools")} variant="accent">{h.schoolsCta}{arrow}</ButtonLink>
                <ButtonLink href={p("/schools")} variant="onDark">{h.learnAboutSchools}</ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- LABS ---------- */}
      {labs.length > 0 && (
        <section className="bg-neural py-16 text-white sm:py-24">
          <Container>
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{h.labsTitle}</h2>
                <p className="mt-3 text-lg text-white/75">{h.labsSubtitle}</p>
              </div>
              <Link href={p("/labs")} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-cyan-300 underline-offset-4 hover:underline">{d.common.viewAll}{arrow}</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{labs.slice(0, 6).map((x) => <LabCard key={x.id} l={x} locale={locale} d={d} />)}</div>
          </Container>
        </section>
      )}

      {/* ---------- NEWS + EVENTS ---------- */}
      <section className="bg-white py-16 sm:py-24">
        <Container className="grid grid-cols-1 gap-12 [&>*]:min-w-0 lg:grid-cols-[2fr_1fr]">
          <div>
            <Heading title={h.newsTitle} href={p("/news")} linkLabel={d.common.viewAll} />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{news.map((a) => <NewsCard key={a.id} a={a} locale={locale} d={d} />)}</div>
          </div>
          <div>
            <Heading title={h.eventsTitle} href={p("/events")} linkLabel={d.common.viewAll} />
            <div className="space-y-3">{events.length ? events.map((e) => <EventCard key={e.id} e={e} locale={locale} d={d} />) : <p className="text-sm text-muted">{d.events.empty}</p>}</div>
          </div>
        </Container>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="bg-neural relative overflow-hidden rounded-[32px] px-8 py-14 text-center text-white sm:px-14 sm:py-20">
            <h2 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">{h.finalTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">{h.finalBody}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href={p("/programs")} variant="accent" size="lg">{h.ctaExplore}{arrow}</ButtonLink>
              <ButtonLink href={p("/contact")} variant="onDark" size="lg">{d.nav.contact}</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
