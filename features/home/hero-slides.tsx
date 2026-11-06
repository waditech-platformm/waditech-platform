"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

export type Slide = { src: string; alt: string };

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => { const m = window.matchMedia(reducedQuery); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };

/**
 * Hero photo slideshow: real photos only, crossfade every 6 s, with a pause/play control and numbered
 * buttons (WCAG 2.2.2). Never autoplays when the visitor prefers reduced motion.
 */
export function HeroSlides({ slides, labels }: { slides: Slide[]; labels: { region: string; pause: string; play: string; go: string } }) {
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(reducedQuery).matches, () => true);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const playing = !paused && !reduced && slides.length > 1;
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % slides.length), 6000);
    return () => window.clearInterval(t);
  }, [playing, slides.length]);
  return (
    <div role="region" aria-roledescription="carousel" aria-label={labels.region} className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-navy-900 ring-1 ring-line lg:aspect-[5/4]">
      {slides.map((s, n) => (
        <Image key={s.src} src={s.src} alt={s.alt} fill priority={n === 0} sizes="(min-width:1024px) 560px, 100vw"
          aria-hidden={n !== i} className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${n === i ? "opacity-100" : "opacity-0"}`} />
      ))}
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-navy-950/70 to-transparent px-4 pb-4 pt-10 font-latin">
          {slides.map((s, n) => (
            <button key={s.src} type="button" onClick={() => setI(n)} aria-label={labels.go.replace("{n}", String(n + 1).padStart(2, "0"))} aria-current={n === i || undefined}
              className={`min-w-10 rounded-full px-2 py-1 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${n === i ? "bg-white text-navy-900" : "text-white/85 hover:text-white"}`}>
              {String(n + 1).padStart(2, "0")}
            </button>
          ))}
          <button type="button" onClick={() => setPaused((v) => !v)} aria-label={playing ? labels.pause : labels.play}
            className="ms-auto grid size-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          </button>
        </div>
      )}
    </div>
  );
}
