"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

/** Accessible disclosure menu for secondary navigation: button with aria-expanded, Escape and outside-click close. */
export function MoreMenu({ label, links }: { label: string; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative" onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <button ref={btn} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[15px] font-medium text-navy-900/80 transition-colors hover:bg-surface hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-500">
        {label}<ChevronDown aria-hidden className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} hidden={!open} className="absolute end-0 top-full z-50 mt-2 w-60 rounded-2xl bg-paper p-2 shadow-[var(--shadow-lift)] ring-1 ring-line">
        <ul>
          {links.map((l) => (
            <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-900 hover:bg-royal-50 focus-visible:bg-royal-50 focus-visible:outline-none">{l.label}</Link></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
