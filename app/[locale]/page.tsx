import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, FlaskConical, QrCode, School, Users, Wrench } from "lucide-react";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { listCourses } from "@/features/catalog/queries";
import { listCompetitions, listLabs, listMedia } from "@/features/content/queries";
import { HeroSlides } from "@/features/home/hero-slides";

/** Product names of lab providers (brand names, same in both languages). */
const PROVIDERS: Record<string, string> = { wokwi: "Wokwi", python_online: "Python", tinkercad: "Tinkercad", scratch: "Scratch", internal: "WadiTech" };

const nfFor = (l: Locale) => new Intl.NumberFormat(l === "ar" ? "ar-JO" : "en-JO");

/** Eyebrow + headline + optional link, used by every section so the page keeps one rhythm. */
function SectionHead({ eyebrow, title, href, link, dark }: { eyebrow: string; title: string; href?: string; link?: string; dark?: boolean }) {
  return (
    <div className="mb-10 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className={`text-sm font-semibold ${dark ? "text-cyan-300" : "text-royal-600"}`}>{eyebrow}</p>
        <h2 className={`mt-3 text-3xl font-bold tracking-tight text-balance sm:text-[2.6rem] sm:leading-[1.12] ${dark ? "text-white" : "text-navy-900"}`}>{title}</h2>
      </div>
      {href && link && (
        <Link href={href} className={`group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline ${dark ? "text-cyan-300" : "text-royal-600"}`}>
          {link}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale: l } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const h = d.home;
  const nf = nfFor(locale);
  const p = (s: string) => `/${locale}${s}`;
  const [courses, labs, comps, photos] = await Promise.all([listCourses(), listLabs(), listCompetitions(4), listMedia({ kind: "image", limit: 14 })]);

  // Real facts only, computed from published data.
  const cats = d.enums.category as Record<string, string>;
  const descs = h.trackDesc as Record<string, string>;
  const byTrack = new Map<string, typeof courses>();
  for (const c of courses) byTrack.set(c.category, [...(byTrack.get(c.category) ?? []), c]);
  const tracks = [...byTrack.entries()].sort((a, b) => b[1].length - a[1].length);
  const ages = courses.flatMap((c) => [c.age_min, c.age_max]).filter((n): n is number => typeof n === "number");
  const facts = [
    tracks.length ? { v: nf.format(tracks.length), k: h.factTracks } : null,
    ages.length ? { v: `${nf.format(Math.min(...ages))}–${nf.format(Math.max(...ages))}`, k: h.factAges } : null,
    labs.length ? { v: nf.format(labs.length), k: h.factLabs } : null,
  ].filter(Boolean) as { v: string; k: string }[];

  const alt = (m: { alt_en: string | null; alt_ar: string | null }) => pick(m, "alt", locale) || "";
  const slides = [
    { src: "/media/brand/lab-entrance.webp", alt: locale === "ar" ? "مدخل مختبر الروبوتات في وادي تك" : "Entrance of the WadiTech robotics lab" },
    { src: "/media/brand/lab-classroom.webp", alt: locale === "ar" ? "محطات البرمجة والروبوتات داخل مختبر وادي تك" : "Coding and robotics stations inside the WadiTech lab" },
    ...photos.slice(0, 1).map((m) => ({ src: m.url, alt: alt(m) })),
  ];
  const photo = (i: number) => photos[i % Math.max(photos.length, 1)];
  const schoolCards = [
    { icon: School, t: h.school1Title, b: h.school1Body, img: photo(1) },
    { icon: FlaskConical, t: h.school2Title, b: h.school2Body, img: { url: "/media/brand/lab-classroom.webp", alt_en: "WadiTech lab workstations", alt_ar: "محطات العمل في مختبر وادي تك" } },
    { icon: Users, t: h.school3Title, b: h.school3Body, img: photo(2) },
  ];
  const steps = [1, 2, 3, 4, 5, 6].map((n) => ({ t: h[`step${n}Title` as "step1Title"], b: h[`step${n}Body` as "step1Body"] }));
  const compPhoto = comps.find((c) => c.cover_url)?.cover_url ?? photo(3)?.url;
  const gallery = photos.slice(4, 10);
  const arrow = <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;

  return (
    <>
      {/* 1 — Hero */}
      <section className="bg-white">
        <Container className="grid grid-cols-1 items-center gap-12 pb-16 pt-12 [&>*]:min-w-0 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <p className="wt-rise text-sm font-semibold text-royal-600">{h.heroEyebrow}</p>
            <h1 className="wt-rise mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-navy-900 sm:text-5xl lg:text-[3.6rem]" style={{ "--i": 1 } as React.CSSProperties}>{h.heroTitle}</h1>
            <p className="wt-rise mt-4 text-xl font-semibold text-cyan-600 sm:text-2xl" style={{ "--i": 2 } as React.CSSProperties}>{h.heroSubtitle}</p>
            <p className="wt-rise mt-5 max-w-xl text-lg leading-relaxed text-muted" style={{ "--i": 3 } as React.CSSProperties}>{h.heroBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={p("/programs")} size="lg">{h.ctaExplore}{arrow}</ButtonLink>
              <ButtonLink href={p("/register")} variant="secondary" size="lg">{d.nav.register}</ButtonLink>
            </div>
            {facts.length > 0 && (
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
                {facts.map((f) => (
                  <div key={f.k} className="flex flex-col"><dt className="mt-1 text-sm text-muted">{f.k}</dt><dd className="order-first text-3xl font-bold tracking-tight text-navy-900 tabular-nums">{f.v}</dd></div>
                ))}
              </dl>
            )}
          </div>
          <div className="wt-rise" style={{ "--i": 2 } as React.CSSProperties}>
            <HeroSlides slides={slides} labels={{ region: h.slidesLabel, pause: h.slidePause, play: h.slidePlay, go: h.slideGo }} />
          </div>
        </Container>
      </section>

      {/* 2 — Find your direction */}
      {tracks.length > 0 && (
        <section className="bg-surface py-20 sm:py-28">
          <Container>
            <SectionHead eyebrow={h.directionEyebrow} title={h.directionTitle} href={p("/programs")} link={h.allPrograms} />
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {tracks.slice(0, 8).map(([key, list], i) => {
                const thumb = list.find((c) => c.thumbnail_url || c.cover_url);
                return (
                  <li key={key}>
                    <Link href={p(`/programs?category=${key}`)} className="group flex h-full overflow-hidden rounded-[24px] bg-white ring-1 ring-line transition-shadow sm:flex-col duration-300 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-royal-100">
                      <span className="relative block w-28 shrink-0 overflow-hidden bg-navy-900 sm:aspect-[16/10] sm:w-auto">
                        {thumb && <Image src={(thumb.thumbnail_url ?? thumb.cover_url)!} alt="" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 112px" className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                        <span className="font-latin text-xs font-semibold text-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                        <span className="mt-2 text-lg font-bold text-navy-900">{cats[key] ?? key}</span>
                        <span className="mt-2 flex-1 text-sm leading-relaxed text-muted">{descs[key] ?? ""}</span>
                        <span className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                          <span className="whitespace-nowrap text-subtle">{list.length === 1 ? h.programs1 : h.programsN.replace("{n}", nf.format(list.length))}</span>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-royal-600">{h.explorePath}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {tracks.length % 4 !== 0 && tracks.length < 8 && (
                <li className="hidden lg:block">
                  <Link href={p("/programs")} className="group flex h-full flex-col justify-end rounded-[24px] bg-navy-950 p-7 text-white transition-colors hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-royal-100">
                    <span className="text-2xl font-bold leading-snug">{h.allPrograms}</span>
                    <span className="mt-2 text-sm text-white/70">{h.programsN.replace("{n}", nf.format(courses.length))}</span>
                    <span className="mt-6 grid size-11 place-items-center rounded-full bg-cyan-500 text-navy-950 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"><ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden /></span>
                  </Link>
                </li>
              )}
            </ul>
          </Container>
        </section>
      )}

      {/* 3 — For schools */}
      <section className="bg-white py-20 sm:py-28">
        <Container>
          <SectionHead eyebrow={h.schoolsEyebrow} title={h.schoolsHeadline} href={p("/schools")} link={h.schoolSolutions} />
          <div className="grid gap-5 md:grid-cols-3">
            {schoolCards.map((c) => (
              <article key={c.t} className="flex flex-col overflow-hidden rounded-[24px] bg-surface ring-1 ring-line">
                <div className="relative aspect-[16/10] bg-navy-900">{c.img && <Image src={c.img.url} alt={alt(c.img)} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover" />}</div>
                <div className="flex flex-1 flex-col p-7">
                  <c.icon className="size-6 text-royal-600" aria-hidden />
                  <h3 className="mt-4 text-xl font-bold text-navy-900">{c.t}</h3>
                  <p className="mt-2 flex-1 leading-relaxed text-muted">{c.b}</p>
                  <Link href={p("/contact?topic=schools")} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-royal-600 underline-offset-4 hover:underline">{h.schoolDiscuss}{arrow}</Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* 4 — Learning journey */}
      <section className="border-y border-line bg-surface py-20 sm:py-28">
        <Container>
          <SectionHead eyebrow={h.journeyEyebrow} title={h.journeyHeadline} />
          <ol className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-6">
            {steps.map((s, i) => (
              <li key={s.t} className="border-t-2 border-navy-900/10 pt-5 first:border-royal-600">
                <span className="font-latin text-sm font-semibold text-royal-600 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-xl font-bold text-navy-900">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.b}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 5 — Interactive labs */}
      {labs.length > 0 && (
        <section className="bg-white py-20 sm:py-28">
          <Container>
            <SectionHead eyebrow={h.labsEyebrow} title={h.labsHeadline} href={p("/labs")} link={h.exploreLabs} />
            <div className="grid gap-5 md:grid-cols-3">
              {labs.slice(0, 3).map((lab, i) => (
                <Link key={lab.id} href={p(`/labs/${lab.slug}`)} className="group flex flex-col rounded-[24px] bg-navy-900 p-7 text-white ring-1 ring-navy-900 transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-royal-100">
                  <span className="flex items-center justify-between">
                    <span className="font-latin text-sm font-semibold text-cyan-300 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 font-latin text-xs font-semibold text-white/85">{PROVIDERS[lab.provider] ?? lab.provider}</span>
                  </span>
                  <span className="mt-10 text-xl font-bold">{pick(lab, "title", locale)}</span>
                  <span className="mt-2 flex-1 text-sm leading-relaxed text-white/75">{pick(lab, "summary", locale)}</span>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300">{h.openLab}{arrow}</span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* 6 — Competitions & innovation (split) */}
      <section className="bg-surface py-20 sm:py-28">
        <Container className="grid grid-cols-1 items-center gap-12 [&>*]:min-w-0 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-navy-900 ring-1 ring-line">
            {compPhoto && <Image src={compPhoto} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover object-top" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-royal-600">{h.compEyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-900 sm:text-[2.6rem] sm:leading-[1.12]">{h.compHeadline}</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">{h.compBody}</p>
            <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-navy-900"><Wrench className="size-4 text-cyan-600" aria-hidden />{h.compTags}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={p("/competitions")}>{h.exploreComps}{arrow}</ButtonLink>
              <ButtonLink href={p("/projects")} variant="secondary">{d.nav.projects}</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* 7 — Credentials (split, reversed) */}
      <section className="bg-white py-20 sm:py-28">
        <Container className="grid grid-cols-1 items-center gap-12 [&>*]:min-w-0 lg:grid-cols-2 lg:gap-20">
          <div className="lg:order-2">
            <div className="mx-auto max-w-md rounded-[28px] bg-navy-950 p-8 text-white ring-1 ring-navy-900 sm:p-10">
              <div className="flex items-center gap-4">
                <Image src="/media/brand/logo-original.png" alt={d.meta.fullName} width={128} height={128} className="size-16 rounded-xl" />
                <p className="text-lg font-bold">{h.credCardTitle}</p>
              </div>
              <ul className="mt-8 space-y-4">
                {[[BadgeCheck, h.credCard1], [QrCode, h.credCard2], [School, h.credCard3]].map(([I, t]) => {
                  const Icon = I as typeof BadgeCheck;
                  return <li key={t as string} className="flex items-center gap-3 border-t border-white/10 pt-4 text-white/85"><Icon className="size-5 text-cyan-300" aria-hidden />{t as string}</li>;
                })}
              </ul>
            </div>
          </div>
          <div className="lg:order-1">
            <p className="text-sm font-semibold text-royal-600">{h.credEyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy-900 sm:text-[2.6rem] sm:leading-[1.12]">{h.credHeadline}</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">{h.credBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={p("/verify")}>{h.credVerify}{arrow}</ButtonLink>
              <ButtonLink href={p("/dashboard/certificates")} variant="secondary">{h.credMine}</ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* 8 — Gallery */}
      {gallery.length > 0 && (
        <section className="bg-surface py-20 sm:py-28">
          <Container>
            <SectionHead eyebrow={h.galleryEyebrow} title={h.galleryHeadline} href={p("/gallery")} link={h.galleryAll} />
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {gallery.map((m) => (
                <li key={m.id}>
                  <figure>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-navy-900">
                      <Image src={m.url} alt={alt(m)} fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover" />
                    </div>
                    {pick(m, "title", locale) && <figcaption className="mt-2 text-sm text-muted">{pick(m, "title", locale)}</figcaption>}
                  </figure>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* 9 — Final call to action */}
      <section className="bg-white py-20 sm:py-28">
        <Container>
          <div className="rounded-[32px] bg-navy-950 px-8 py-16 text-center text-white sm:px-14 sm:py-20">
            <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{h.finalHeadline}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">{h.finalBody}</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <ButtonLink href={p("/register")} variant="accent" size="lg">{d.nav.register}{arrow}</ButtonLink>
              <ButtonLink href={p("/contact?topic=schools")} variant="onDark" size="lg">{h.partner}</ButtonLink>
              <ButtonLink href={p("/contact")} variant="onDark" size="lg">{h.getInTouch}</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
