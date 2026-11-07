"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { cn } from "@/lib/cn";

export type ReelItem = { kind: "video"; src: string; poster: string; label: string } | { kind: "image"; src: string; label: string };

/**
 * Two rows of short lab clips and photos gliding in opposite directions (CSS marquee, globals.css .wt-marquee).
 * - Videos are muted, looped, inline, preload="none", and play only while the reel is on screen.
 * - Hover or keyboard focus pauses the motion; reduced motion shows a still, scrollable strip with posters.
 * - Each row is rendered twice so the loop is seamless; the copy is hidden from assistive tech.
 */
export function LabReel({ rows }: { rows: [ReelItem[], ReelItem[]] }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const vids = () => [...el.querySelectorAll("video")];
    const setPlaying = (on: boolean) => vids().forEach((v) => { if (on && !reduce.matches) v.play().catch(() => {}); else v.pause(); });
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const onVis = () => setPlaying(!document.hidden && el.getBoundingClientRect().top < innerHeight);
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return (
    <div ref={root} className="wt-marquee space-y-4" dir="ltr">
      {rows.map((row, r) => (
        <div key={r} className="wt-marquee-row overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className={cn("wt-marquee-track flex w-max gap-4", r === 1 && "wt-marquee-reverse")}>
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 gap-4" aria-hidden={copy === 1}>
                {row.map((it) => (
                  <li key={`${copy}-${it.src}`} className="group relative aspect-[9/16] w-40 shrink-0 overflow-hidden rounded-2xl bg-deep-900 ring-1 ring-white/10 sm:w-48">
                    {it.kind === "video" ? (
                      <video src={it.src} poster={it.poster} muted loop playsInline preload="none" tabIndex={-1} className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <Image src={it.src} alt="" fill sizes="192px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    )}
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-deep-950/90 to-transparent" />
                    <span className="absolute inset-x-3 bottom-3 flex items-center gap-1.5 text-xs font-semibold leading-snug text-white" dir="auto">
                      {it.kind === "video" && <Play className="size-3 shrink-0 fill-cyan-300 text-cyan-300" aria-hidden />}
                      {it.label}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
