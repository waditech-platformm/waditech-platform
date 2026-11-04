"use client";
import { useEffect, useRef } from "react";

/** Muted, looping clip that only loads & plays while visible (saves bandwidth, respects reduced motion). */
export function VideoTile({ src, poster, label, className }: { src: string; poster?: string | null; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !reduce) { v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
    }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video ref={ref} className={className} src={src} poster={poster ?? undefined} muted loop playsInline preload="none" aria-label={label} controls={false} />
  );
}
