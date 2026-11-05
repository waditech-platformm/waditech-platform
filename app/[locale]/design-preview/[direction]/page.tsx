import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { env } from "@/lib/env";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { VideoTile } from "@/components/video-tile";
import { priceLabel } from "@/components/cards";
import { previewCopy } from "@/features/design-preview/copy";
import { AGE_BANDS, overlaps, previewData } from "@/features/design-preview/data";
import type { Course } from "@/features/catalog/queries";
import type { Media } from "@/features/content/queries";

/**
 * DESIGN-DIRECTION PREVIEWS (temporary, staging only).
 * Three distinct treatments of the hero + one representative section, rendered with real data and real media.
 * Returns 404 in production. Removed once a direction is approved.
 */
export const metadata = { robots: { index: false, follow: false } };

type Copy = (typeof previewCopy)["en"] | (typeof previewCopy)["ar"];
type Props = { locale: Locale; t: Copy; courses: Course[]; photos: Media[]; videos: Media[]; sp: Record<string, string | string[] | undefined> };

export default async function DesignPreview({ params, searchParams }: PageProps<"/[locale]/design-preview/[direction]">) {
  if (env().APP_ENV === "production") notFound();
  const { locale: l, direction } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  if (!["a", "b", "c"].includes(direction)) notFound();
  const t = previewCopy[locale];
  const data = await previewData();
  const props: Props = { locale, t, ...data, sp: await searchParams };
  return (
    <>
      <PreviewSwitcher locale={locale} t={t} current={direction} />
      {direction === "a" && <DirectionA {...props} />}
      {direction === "b" && <DirectionB {...props} />}
      {direction === "c" && <DirectionC {...props} />}
    </>
  );
}

function PreviewSwitcher({ locale, t, current }: { locale: Locale; t: Copy; current: string }) {
  return (
    <nav aria-label={t.choose} className="border-b border-line bg-white">
      <Container className="flex flex-wrap items-center gap-2 py-2 text-sm">
        <span className="me-2 rounded-md bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning">{t.previewBadge}</span>
        {(["a", "b", "c"] as const).map((k) => (
          <Link key={k} href={`/${locale}/design-preview/${k}`} aria-current={current === k ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-semibold ${current === k ? "bg-navy-900 text-white" : "text-muted hover:bg-surface"}`}>
            {t[k]}
          </Link>
        ))}
      </Container>
    </nav>
  );
}

const display = "text-balance font-semibold text-navy-900 [html[lang=ar]_&]:font-bold";

/* ─────────────────────────────── A — Technical precision ─────────────────────────────── */
// Engineering-drawing language: a white sheet, an oversized precise headline, and the real lab photo
// annotated with hairline callouts that point at what is actually in the picture.
const CALLOUTS = [
  { x: 12, y: 34 }, // trophy & project shelf (left wall)
  { x: 46, y: 46 }, // glass entrance to the lab
  { x: 77, y: 58 }, // coding stations along the right wall
  { x: 83, y: 80 }, // reception desk with robot kits
];

function DirectionA({ locale, t, courses }: Props) {
  const d = getDict(locale);
  const ar = locale === "ar";
  return (
    <>
      <section className="bg-white">
        <Container className="pt-14 pb-10 sm:pt-20 lg:pt-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 [&>*]:min-w-0">
            <h1 className={`${display} lg:col-span-10 text-[clamp(2.6rem,7.2vw,6.25rem)] ${ar ? "leading-[1.2]" : "leading-[0.98] tracking-[-0.045em]"}`}>{t.title}</h1>
            <div className="flex flex-col gap-6 lg:col-span-5 lg:col-start-1">
              <p className="text-lg text-muted sm:text-xl">{t.lead}</p>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink href={`/${locale}/programs`} size="lg">{t.explore}</ButtonLink>
                <ButtonLink href={`/${locale}/about`} variant="ghost" size="lg">{t.discover}</ButtonLink>
              </div>
            </div>
            <ol className="flex flex-wrap items-end gap-3 text-xl font-semibold text-royal-600 sm:gap-6 sm:text-3xl lg:col-span-6 lg:col-start-7 lg:justify-end" aria-label="LEARN · BUILD · INNOVATE">
              {t.tagline.map((w, i) => (
                <li key={w} className="flex items-center gap-3 sm:gap-6">{i > 0 && <span aria-hidden className="h-px w-5 bg-line sm:w-14" />}{w}</li>
              ))}
            </ol>
          </div>
        </Container>
        <Container className="pb-16 sm:pb-24">
          <figure className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] ring-1 ring-line sm:aspect-[21/9]">
              <Image src="/media/brand/lab-entrance.webp" alt={ar ? "مدخل مختبر الروبوتات في وادي تك" : "Entrance of the WadiTech robotics lab"} fill priority sizes="(min-width:1280px) 1216px, 100vw" className="object-cover" />
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {CALLOUTS.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="0.9" fill="#20C9CF" stroke="white" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />)}
              </svg>
              {CALLOUTS.map((c, i) => {
                // labels near the right edge point leftwards so they never run off the photo
                const flip = c.x > 60;
                const pos = flip ? { right: `${100 - c.x}%` } : { left: `${c.x}%` };
                return (
                  <span key={i} dir={ar ? "rtl" : "ltr"} className={`absolute hidden -translate-y-1/2 items-center gap-2 sm:flex ${flip ? "flex-row-reverse" : ""}`} style={{ ...pos, top: `${c.y}%` }}>
                    <span aria-hidden className={`h-px w-8 bg-white/90 ${flip ? "me-2" : "ms-2"}`} />
                    <span className="whitespace-nowrap rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-navy-900 shadow-sm">{t.callouts[i]}</span>
                  </span>
                );
              })}
              <div className="absolute bottom-3 end-3 w-14 overflow-hidden rounded-xl ring-1 ring-white/30 sm:bottom-4 sm:end-4 sm:w-32 sm:rounded-2xl">
                <Image src="/media/brand/logo-original.png" alt={d.meta.fullName} width={256} height={256} className="h-auto w-full" />
              </div>
            </div>
            <figcaption className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted sm:hidden">
              {t.callouts.map((c) => <span key={c} className="flex items-center gap-2"><span aria-hidden className="size-2 rounded-full bg-cyan-500" />{c}</span>)}
            </figcaption>
          </figure>
        </Container>
      </section>

      <section className="border-t border-line bg-white">
        <Container className="py-16 sm:py-24">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <h2 className={`${display} text-4xl sm:text-5xl ${ar ? "" : "tracking-[-0.03em]"}`}>{t.pathTitle}</h2>
              <p className="mt-3 text-lg text-muted">{t.pathLead}</p>
            </div>
            <Link href={`/${locale}/programs`} className="font-semibold text-royal-600 underline-offset-4 hover:underline">{t.viewAll}</Link>
          </div>
          <div className="grid divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0 rtl:md:divide-x-reverse">
            {AGE_BANDS.map((b) => {
              const list = courses.filter((c) => overlaps(c, b.min, b.max)).slice(0, 4);
              return (
                <div key={b.key} className="py-8 md:px-8 md:first:ps-0 md:last:pe-0">
                  <p className="font-latin text-5xl font-semibold tracking-tight text-navy-900" dir="ltr">{b.key.replace("-", "–")}</p>
                  <p className="mt-1 text-sm text-subtle">{t.ages[b.key]}</p>
                  <ul className="mt-6 space-y-1">
                    {list.length === 0 && <li className="text-sm text-subtle">{t.none}</li>}
                    {list.map((c) => (
                      <li key={c.id}>
                        <Link href={`/${locale}/programs/${c.slug}`} className="group flex items-baseline justify-between gap-4 rounded-lg py-2.5 hover:text-royal-600">
                          <span className="font-semibold">{pick(c, "title", locale)}</span>
                          <span className="shrink-0 text-sm text-subtle group-hover:text-royal-600">{priceLabel(c, locale, d)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}

/* ─────────────────────────────── B — Cinematic ─────────────────────────────── */
// Real academy footage carries the page: a full-bleed silent loop under a navy veil, then a filmstrip
// of real competition photos, then a bento of student projects.
function DirectionB({ locale, t, photos, videos }: Props) {
  const d = getDict(locale);
  const ar = locale === "ar";
  const hero = videos.find((v) => v.category === "competition") ?? videos[0];
  const film = photos.filter((p) => p.category === "competition").slice(0, 8);
  const bento = photos.filter((p) => p.category === "projects" || p.category === "classroom").slice(0, 5);
  return (
    <>
      <section className="relative isolate flex min-h-[620px] items-end overflow-hidden bg-navy-950 text-white sm:min-h-[86svh]">
        {hero ? (
          <VideoTile src={hero.url} poster={hero.poster_url} label={pick(hero, "alt", locale)} className="absolute inset-0 -z-10 size-full object-cover opacity-70" />
        ) : (
          <Image src="/media/brand/lab-entrance.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-60" />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950 via-navy-950/55 to-navy-950/10" />
        <Container className="pb-14 pt-32 sm:pb-20">
          <div className="max-w-4xl">
            <p className="mb-5 flex gap-3 text-lg font-semibold text-cyan-300 sm:text-xl">{t.tagline.join(" ")}</p>
            <h1 className={`text-balance font-semibold text-[clamp(2.5rem,6.4vw,5.5rem)] ${ar ? "font-bold leading-[1.2]" : "leading-[1.0] tracking-[-0.04em]"}`}>{t.title}</h1>
            <p className="mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">{t.lead}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href={`/${locale}/programs`} variant="accent" size="lg">{t.explore}</ButtonLink>
              <ButtonLink href={`/${locale}/about`} variant="onDark" size="lg">{t.discover}</ButtonLink>
            </div>
          </div>
        </Container>
        <div className="absolute bottom-6 end-6 hidden w-28 overflow-hidden rounded-2xl ring-1 ring-white/20 lg:block">
          <Image src="/media/brand/logo-original.png" alt={d.meta.fullName} width={224} height={224} className="h-auto w-full" />
        </div>
      </section>

      <section className="bg-navy-950 pb-16 text-white">
        <Container className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <div>
            <h2 className={`text-3xl font-semibold sm:text-4xl ${ar ? "font-bold" : "tracking-[-0.02em]"}`}>{t.filmTitle}</h2>
            <p className="mt-2 text-white/70">{t.filmLead}</p>
          </div>
        </Container>
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8 [scrollbar-width:thin]" aria-label={t.filmTitle}>
          {film.map((p) => (
            <li key={p.id} className="relative aspect-[4/3] w-[78vw] shrink-0 snap-start overflow-hidden rounded-xl sm:w-[360px]">
              <Image src={p.url} alt={pick(p, "alt", locale)} fill sizes="(min-width:640px) 360px, 78vw" className="object-cover" />
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white">
        <Container className="py-16 sm:py-24">
          <h2 className={`${display} mb-10 text-4xl sm:text-5xl ${ar ? "" : "tracking-[-0.03em]"}`}>{t.projectsTitle}</h2>
          <div className="grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[220px] lg:grid-cols-4">
            {bento.map((p, i) => (
              <figure key={p.id} className={`relative overflow-hidden rounded-2xl bg-surface ${i === 0 ? "col-span-2 row-span-2" : ""} ${i === 3 ? "lg:col-span-2" : ""}`}>
                <Image src={p.url} alt={pick(p, "alt", locale)} fill sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover" />
                {pick(p, "title", locale) && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/80 to-transparent p-4 pt-10 text-sm font-semibold text-white">{pick(p, "title", locale)}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

/* ─────────────────────────────── C — Interactive learning ─────────────────────────────── */
// The hero *is* the product: a program finder that filters real published programs by age and track,
// followed by the learning journey (a genuine sequence, so it is numbered).
const TRACKS = ["robotics", "ai", "programming", "electronics", "cybersecurity", "3d_printing"] as const;

function DirectionC({ locale, t, courses, photos, sp }: Props) {
  const d = getDict(locale);
  const ar = locale === "ar";
  const age = typeof sp.age === "string" ? AGE_BANDS.find((b) => b.key === sp.age) : undefined;
  const track = typeof sp.track === "string" && (TRACKS as readonly string[]).includes(sp.track) ? sp.track : undefined;
  const results = courses.filter((c) => (!age || overlaps(c, age.min, age.max)) && (!track || c.category === track));
  const q = (next: { age?: string; track?: string }) => {
    const p = new URLSearchParams();
    const a = "age" in next ? next.age : age?.key;
    const tr = "track" in next ? next.track : track;
    if (a) p.set("age", a);
    if (tr) p.set("track", tr);
    const s = p.toString();
    return `/${locale}/design-preview/c${s ? `?${s}` : ""}#finder`;
  };
  const chip = (active: boolean) =>
    `inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold ring-1 transition-colors ${active ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-navy-900 ring-line hover:ring-royal-500"}`;
  const steps = photos.filter((p) => p.category === "classroom" || p.category === "projects" || p.category === "competition");
  const stepPhotos = [steps.find((p) => p.category === "classroom"), steps.find((p) => p.category === "projects"), steps.find((p) => p.category === "competition")];

  return (
    <>
      <section className="bg-neural text-white">
        <Container className="grid grid-cols-1 gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:items-center lg:py-24 [&>*]:min-w-0">
          <div className="lg:col-span-6">
            <h1 className={`text-balance font-semibold text-[clamp(2.4rem,5.2vw,4.5rem)] ${ar ? "font-bold leading-[1.2]" : "leading-[1.02] tracking-[-0.04em]"}`}>{t.title}</h1>
            <p className="mt-5 text-xl font-semibold text-cyan-300">{t.tagline.join(" ")}</p>
            <p className="mt-5 max-w-xl text-lg text-white/80">{t.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/${locale}/programs`} variant="accent" size="lg">{t.explore}</ButtonLink>
              <ButtonLink href={`/${locale}/about`} variant="onDark" size="lg">{t.discover}</ButtonLink>
            </div>
          </div>
          <div id="finder" className="scroll-mt-24 rounded-3xl bg-white p-5 text-ink shadow-2xl ring-1 ring-white/10 sm:p-7 lg:col-span-6">
            <h2 className="text-xl font-bold text-navy-900">{t.finderTitle}</h2>
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-semibold text-muted">{t.finderAge}</legend>
              <div className="flex flex-wrap gap-2">
                <Link href={q({ age: undefined })} className={chip(!age)} aria-current={!age ? "true" : undefined}>{t.finderAll}</Link>
                {AGE_BANDS.map((b) => <Link key={b.key} href={q({ age: b.key })} className={chip(age?.key === b.key)} aria-current={age?.key === b.key ? "true" : undefined}>{t.ages[b.key]}</Link>)}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-semibold text-muted">{t.finderTrack}</legend>
              <div className="flex flex-wrap gap-2">
                <Link href={q({ track: undefined })} className={chip(!track)} aria-current={!track ? "true" : undefined}>{t.finderAll}</Link>
                {TRACKS.map((k) => <Link key={k} href={q({ track: k })} className={chip(track === k)} aria-current={track === k ? "true" : undefined}>{t.tracks[k]}</Link>)}
              </div>
            </fieldset>
            <div className="mt-6 border-t border-line pt-4" aria-live="polite">
              <p className="text-sm font-semibold text-muted">{t.matches(results.length)}</p>
              <ul className="mt-2 divide-y divide-line">
                {results.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link href={`/${locale}/programs/${c.slug}`} className="flex items-center gap-4 py-3 hover:text-royal-600">
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-surface">
                        {(c.thumbnail_url || c.cover_url) && <Image src={(c.thumbnail_url || c.cover_url)!} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{pick(c, "title", locale)}</span>
                        <span className="block text-xs text-subtle">{c.age_min}–{c.age_max} · {t.tracks[c.category as keyof typeof t.tracks] ?? c.category}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold">{priceLabel(c, locale, d)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white">
        <Container className="py-16 sm:py-24">
          <h2 className={`${display} mb-12 text-4xl sm:text-5xl ${ar ? "" : "tracking-[-0.03em]"}`}>{t.journeyTitle}</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {t.journey.map((s, i) => (
              <li key={s.t} className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
                <div className="relative aspect-[4/3] bg-navy-900">
                  {stepPhotos[i] && <Image src={stepPhotos[i]!.url} alt={pick(stepPhotos[i]!, "alt", locale)} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover" />}
                </div>
                <div className="p-6">
                  <p className="flex items-center gap-3 text-2xl font-semibold text-navy-900"><span className="grid size-9 place-items-center rounded-full bg-royal-600 font-latin text-base text-white">{i + 1}</span>{s.t}</p>
                  <p className="mt-3 text-muted">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
