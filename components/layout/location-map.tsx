"use client";
import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";

/** WadiTech Academy for AI & Robotics, Amman (from the academy's Google Maps listing). */
export const ACADEMY_LOCATION = {
  lat: 31.9893368,
  lng: 35.8731771,
  name: "WadiTech Academy for AI & Robotics",
  mapsUrl: "https://maps.app.goo.gl/SvVRXnZFxjg1qbnv6",
};

/**
 * Click-to-load Google Map. The iframe (third-party cookies, ~1 MB) only loads when the visitor asks,
 * so the footer costs nothing on every page and no Google request happens without consent.
 * CSP: frame-src allows https://www.google.com (proxy.ts).
 */
export function LocationMap({ locale, labels }: { locale: string; labels: { show: string; directions: string; note: string; title: string } }) {
  const [on, setOn] = useState(false);
  const q = encodeURIComponent(ACADEMY_LOCATION.name);
  const src = `https://www.google.com/maps?q=${q}&ll=${ACADEMY_LOCATION.lat},${ACADEMY_LOCATION.lng}&z=16&hl=${locale}&output=embed`;
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-deep-950 ring-1 ring-line">
      {on ? (
        <iframe title={labels.title} src={src} className="absolute inset-0 size-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-neural p-5 text-center text-white">
          <div>
            <span className="relative mx-auto grid size-12 place-items-center rounded-full bg-cyan-500 text-deep-950">
              <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-cyan-500/50 motion-reduce:hidden" />
              <MapPin className="relative size-6" aria-hidden />
            </span>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setOn(true)} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25 hover:bg-white/20">{labels.show}</button>
              <a href={ACADEMY_LOCATION.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-deep-950 hover:bg-cyan-300">
                <Navigation className="size-4" aria-hidden />{labels.directions}
              </a>
            </div>
            <p className="mt-3 text-xs text-white/70">{labels.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}
