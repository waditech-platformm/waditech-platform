"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AGE_BANDS } from "./age-bands";

export type FinderCourse = { id: string; slug: string; title: string; category: string; categoryLabel: string; age_min: number | null; age_max: number | null; price: string; thumb: string | null };
export type FinderLabels = { title: string; age: string; track: string; all: string; m0: string; m1: string; m2: string; mN: string; seeMatching: string; ages: Record<string, string> };


/**
 * Program finder (homepage hero). Filters real published programs by age band and track.
 * Chips are real links (?age=&track=) so it also works without JavaScript; with JavaScript the list
 * updates in place without a page load and the URL is kept in sync.
 */
export function ProgramFinder({ locale, courses, tracks, labels, initialAge, initialTrack }: {
  locale: string; courses: FinderCourse[]; tracks: { key: string; label: string }[]; labels: FinderLabels; initialAge?: string; initialTrack?: string;
}) {
  const [age, setAge] = useState<string | undefined>(initialAge);
  const [track, setTrack] = useState<string | undefined>(initialTrack);
  const band = AGE_BANDS.find((b) => b.key === age);
  const results = courses.filter((c) => (!band || ((c.age_min ?? 0) <= band.max && (c.age_max ?? 99) >= band.min)) && (!track || c.category === track));
  const href = (a?: string, t?: string) => {
    const p = new URLSearchParams();
    if (a) p.set("age", a);
    if (t) p.set("track", t);
    const s = p.toString();
    return `/${locale}${s ? `?${s}` : ""}#finder`;
  };
  const choose = (e: React.MouseEvent, a?: string, t?: string) => {
    e.preventDefault();
    setAge(a);
    setTrack(t);
    window.history.replaceState(null, "", href(a, t));
  };
  const count = results.length;
  const countLabel = count === 0 ? labels.m0 : count === 1 ? labels.m1 : count === 2 ? labels.m2 : labels.mN.replace("{n}", String(count));
  const more = new URLSearchParams();
  if (track) more.set("category", track);
  if (band) more.set("age", String(band.mid));
  const chip = (active: boolean) =>
    `inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-semibold ring-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-royal-100 ${active ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-navy-900 ring-line hover:ring-royal-500"}`;

  return (
    <div id="finder" className="scroll-mt-24 rounded-[28px] bg-white p-5 shadow-[0_1px_2px_rgb(16_28_61/0.06),0_24px_60px_-28px_rgb(16_28_61/0.35)] ring-1 ring-line sm:p-7">
      <h2 className="text-xl font-bold text-navy-900">{labels.title}</h2>
      <div role="group" aria-label={labels.age} className="mt-5">
        <p className="mb-2 text-sm font-semibold text-muted">{labels.age}</p>
        <div className="flex flex-wrap gap-2">
          <a href={href(undefined, track)} onClick={(e) => choose(e, undefined, track)} className={chip(!age)} aria-current={(!age) || undefined}>{labels.all}</a>
          {AGE_BANDS.map((b) => <a key={b.key} href={href(b.key, track)} onClick={(e) => choose(e, b.key, track)} className={chip(age === b.key)} aria-current={(age === b.key) || undefined}>{labels.ages[b.key]}</a>)}
        </div>
      </div>
      <div role="group" aria-label={labels.track} className="mt-4">
        <p className="mb-2 text-sm font-semibold text-muted">{labels.track}</p>
        <div className="flex flex-wrap gap-2">
          <a href={href(age, undefined)} onClick={(e) => choose(e, age, undefined)} className={chip(!track)} aria-current={(!track) || undefined}>{labels.all}</a>
          {tracks.map((t) => <a key={t.key} href={href(age, t.key)} onClick={(e) => choose(e, age, t.key)} className={chip(track === t.key)} aria-current={(track === t.key) || undefined}>{t.label}</a>)}
        </div>
      </div>
      <div className="mt-6 border-t border-line pt-4">
        <p className="text-sm font-semibold text-muted" aria-live="polite">{countLabel}</p>
        <ul className="mt-1 divide-y divide-line">
          {results.slice(0, 4).map((c) => (
            <li key={c.id}>
              <Link href={`/${locale}/programs/${c.slug}`} className="group flex items-center gap-4 rounded-xl py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-royal-100">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-surface">
                  {c.thumb && <Image src={c.thumb} alt="" fill sizes="48px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-navy-900 group-hover:text-royal-600">{c.title}</span>
                  <span className="block text-xs text-subtle"><span dir="ltr" className="font-latin">{c.age_min}–{c.age_max}</span> · {c.categoryLabel}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-navy-900">{c.price}</span>
              </Link>
            </li>
          ))}
        </ul>
        {count > 0 && (
          <Link href={`/${locale}/programs${more.toString() ? `?${more}` : ""}`} className="mt-3 inline-flex text-sm font-semibold text-royal-600 underline-offset-4 hover:underline">{labels.seeMatching}</Link>
        )}
      </div>
    </div>
  );
}
