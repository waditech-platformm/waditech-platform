"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";

export type BackdropSlide = { src: string; label: string; kb?: [string, string] };

const INTERVAL = 7000; // ms per photo

/**
 * Full-bleed photo background for the homepage hero.
 * - Cross-fades through lab photos; the visible one drifts slowly (Ken Burns, CSS in globals.css).
 * - Loads lazily: the first photo is eager (LCP), the next one is fetched just before it's needed.
 * - Pauses off-screen, in background tabs, on the visitor's request (WCAG 2.2.2), and never
 *   auto-advances with prefers-reduced-motion.
 * - Captions say what each photo shows; they double as controls to jump to a photo.
 */
export function HeroBackdrop({ slides, labels }: { slides: BackdropSlide[]; labels: { pause: string; play: string; region: string; go: string } }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0, 1]));
  const [reduce, setReduce] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (root.current) io.observe(root.current);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { mq.removeEventListener("change", sync); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // Show photo n and make sure the one after it is in the DOM, so it has loaded before its fade.
  const show = (n: number) => {
    const next = (n + 1) % slides.length;
    setI(n);
    setMounted((m) => (m.has(n) && m.has(next) ? m : new Set([...m, n, next])));
  };

  const running = !paused && visible && !reduce && slides.length > 1;
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => show((i + 1) % slides.length), INTERVAL);
    return () => window.clearTimeout(t);
  }, [running, i, slides.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // No z-index on this wrapper: the photos sit at -z-20 behind the overlays, while the caption strip (z-10)
    // stays above the hero text container so its buttons are clickable.
    <div ref={root} className="absolute inset-0" role="region" aria-roledescription="carousel" aria-label={labels.region}>
      {slides.map((s, n) => (
        <div key={s.src} className="wt-slide absolute inset-0 -z-20 overflow-hidden" data-active={n === i} aria-hidden={n !== i}
          style={{ "--kb-x": s.kb?.[0] ?? "0%", "--kb-y": s.kb?.[1] ?? "0%" } as React.CSSProperties}>
          {mounted.has(n) && (
            <Image src={s.src} alt="" fill sizes="100vw" priority={n === 0} quality={70} className="object-cover" />
          )}
        </div>
      ))}

      {/* caption strip: what's on screen, progress, jump-to and pause */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pb-5 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? labels.play : labels.pause}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/20">
            {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          </button>
          <ol className="flex min-w-0 flex-1 gap-2">
            {slides.map((s, n) => (
              <li key={s.src} className="min-w-0 flex-1">
                {/* the visible caption is the button's name (WCAG 2.5.3); on phones it stays for screen readers only */}
                <button type="button" onClick={() => show(n)} aria-current={n === i}
                  className="group block w-full text-start">
                  <span className="relative block h-0.5 overflow-hidden rounded-full bg-white/25">
                    {n === i && <span key={`${i}-${paused}`} className={cn("absolute inset-0 bg-cyan-300", running ? "wt-progress" : "")} style={{ animationDuration: `${INTERVAL}ms` }} />}
                    {n < i && <span className="absolute inset-0 bg-white/60" />}
                  </span>
                  <span className={cn("sr-only mt-2 truncate text-xs font-medium transition-colors sm:not-sr-only sm:block", n === i ? "text-white" : "text-white/70 group-hover:text-white")}>{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
