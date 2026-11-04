"use client";
import { useEffect, useRef, useState } from "react";
import { trackVideoAction } from "../actions";
import { useI18n } from "@/components/i18n-provider";
import { ProgressBar } from "@/components/ui/primitives";

/**
 * Reports the furthest *actually watched* point. Seeking ahead does not count:
 * we accumulate watched seconds from timeupdate deltas under 2s (normal playback only).
 */
export function VideoLesson({ lessonId, src, poster, initialPercent, startAt, trackable }: {
  lessonId: string; src: string; poster?: string; initialPercent: number; startAt: number; trackable: boolean;
}) {
  const { dict } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const watched = useRef<Set<number>>(new Set());
  const last = useRef(0);
  const [pct, setPct] = useState(initialPercent);
  const sent = useRef(initialPercent);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => { if (startAt > 0 && startAt < v.duration - 2) v.currentTime = startAt; last.current = v.currentTime; };
    const onTime = () => {
      const t = v.currentTime;
      if (t - last.current > 0 && t - last.current < 2) for (let s = Math.floor(last.current); s <= Math.floor(t); s++) watched.current.add(s);
      last.current = t;
      if (!v.duration) return;
      const local = Math.round((watched.current.size / Math.max(1, Math.ceil(v.duration))) * 100);
      setPct((p) => Math.max(p, Math.min(100, local)));
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    return () => { v.removeEventListener("loadedmetadata", onMeta); v.removeEventListener("timeupdate", onTime); };
  }, [startAt]);

  useEffect(() => {
    if (!trackable) return;
    const id = setInterval(() => {
      const v = ref.current;
      if (!v) return;
      if (pct > sent.current || !v.paused) {
        sent.current = Math.max(sent.current, pct);
        void trackVideoAction(lessonId, pct, v.currentTime);
      }
    }, 5000);
    const flush = () => { const v = ref.current; if (v) void trackVideoAction(lessonId, pct, v.currentTime); };
    window.addEventListener("pagehide", flush);
    return () => { clearInterval(id); window.removeEventListener("pagehide", flush); };
  }, [lessonId, pct, trackable]);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-black">
        <video ref={ref} src={src} poster={poster} controls playsInline preload="metadata" className="aspect-video w-full" controlsList="nodownload"
          onEnded={() => trackable && void trackVideoAction(lessonId, pct, 0)} />
      </div>
      {trackable && (
        <div className="mt-3 flex items-center gap-3 text-xs text-subtle">
          <ProgressBar value={pct} className="flex-1" label={dict.dashboard.progress} /><span className="tabular-nums">{pct}%</span>
        </div>
      )}
    </div>
  );
}
