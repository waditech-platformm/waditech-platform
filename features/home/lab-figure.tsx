import Image from "next/image";

/**
 * The supplied lab image presented like an engineering drawing: hairline callouts point at what is
 * actually in the picture. Positions are percentages of the image; labels near the right edge point
 * leftwards so they never leave the photo. On small screens the callouts become a legend.
 */
const CALLOUTS = [
  { x: 12, y: 34 }, // trophy & project shelf (left wall)
  { x: 46, y: 46 }, // glass entrance to the lab
  { x: 77, y: 58 }, // coding stations along the right wall
  { x: 83, y: 80 }, // reception desk with robot kits
];

export function LabFigure({ alt, labels, caption, note, logoAlt }: { alt: string; labels: string[]; caption: string; note: string; logoAlt: string }) {
  return (
    <figure className="relative">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] ring-1 ring-line sm:aspect-[21/9]">
        <Image src="/media/brand/lab-entrance.webp" alt={alt} fill sizes="(min-width:1280px) 1216px, 100vw" className="object-cover" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {CALLOUTS.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r="0.9" fill="#20C9CF" stroke="white" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />)}
        </svg>
        {CALLOUTS.map((c, i) => {
          const flip = c.x > 60;
          return (
            <span key={i} aria-hidden dir="ltr" className={`absolute hidden -translate-y-1/2 items-center gap-2 sm:flex ${flip ? "flex-row-reverse" : ""}`} style={{ ...(flip ? { right: `${100 - c.x}%` } : { left: `${c.x}%` }), top: `${c.y}%` }}>
              <span className={`h-px w-8 bg-white/90 ${flip ? "me-2" : "ms-2"}`} />
              <span className="whitespace-nowrap rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-navy-900 shadow-sm">{labels[i]}</span>
            </span>
          );
        })}
        <div className="absolute bottom-3 end-3 w-14 overflow-hidden rounded-xl ring-1 ring-white/30 sm:bottom-4 sm:end-4 sm:w-28 sm:rounded-2xl">
          <Image src="/media/brand/logo-original.png" alt={logoAlt} width={224} height={224} className="h-auto w-full" />
        </div>
      </div>
      <figcaption className="mt-4 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-baseline sm:justify-between">
        <span><span className="font-semibold text-navy-900">{caption}</span> <span className="text-subtle">— {note}</span></span>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:hidden">
          {labels.map((l) => <li key={l} className="flex items-center gap-2"><span aria-hidden className="size-2 rounded-full bg-cyan-500" />{l}</li>)}
        </ul>
        <span className="sr-only sm:not-sr-only sm:hidden">{labels.join(", ")}</span>
      </figcaption>
    </figure>
  );
}
