"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Megaphone, X } from "lucide-react";

const noop = () => () => {};

/** CMS-driven announcement (published "breaking" news). Dismissal is remembered per article in this browser. */
export function AnnouncementBar({ id, href, label, title, dismissLabel }: { id: string; href: string; label: string; title: string; dismissLabel: string }) {
  const key = `wt_dismissed_${id}`;
  const [hidden, setHidden] = useState(false);
  const stored = useSyncExternalStore(noop, () => { try { return window.localStorage.getItem(key) === "1"; } catch { return false; } }, () => false);
  if (hidden || stored) return null;
  return (
    <div className="no-print bg-action-hover text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold"><Megaphone className="size-3.5" aria-hidden />{label}</span>
          <span className="truncate font-medium">{title}</span>
        </Link>
        <button type="button" onClick={() => { setHidden(true); try { window.localStorage.setItem(key, "1"); } catch {} }}
          className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" aria-label={dismissLabel}>
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
