"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const OPEN_DELAY = 90; // ms: hover intent, so sweeping the cursor across the nav doesn't flash panels
const CLOSE_DELAY = 180; // ms: lets the cursor travel from the trigger into the panel

/**
 * Header item with a hover / focus flyout ("mega menu").
 * - Mouse: hovering the item opens the panel after a short intent delay.
 * - Keyboard & touch: the chevron button toggles it (aria-expanded); Escape closes and returns focus.
 * - The label itself stays a normal link to the section page.
 */
export function NavFlyout({
  href, label, toggleLabel, children, width = "w-[min(44rem,calc(100vw-2rem))]", align = "start",
}: {
  href: string; label: string; toggleLabel: string; children: React.ReactNode; width?: string; align?: "start" | "center";
}) {
  const pathname = usePathname();
  // "open" is tied to the path it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const lastPointer = useRef<string | null>(null);
  const openedAt = useRef(0);
  const later = (v: boolean, ms: number) => {
    clear();
    timer.current = setTimeout(() => { if (v) openedAt.current = Date.now(); setOpenOn(v ? pathname : null); }, ms);
  };

  useEffect(() => clear, []);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpenOn(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenOn(null); btn.current?.focus(); } };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const isMouse = (e: React.PointerEvent) => e.pointerType === "mouse";
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div
      ref={root}
      className="relative"
      onPointerEnter={(e) => isMouse(e) && later(true, OPEN_DELAY)}
      onPointerLeave={(e) => isMouse(e) && later(false, CLOSE_DELAY)}
      onBlur={(e) => { if (!root.current?.contains(e.relatedTarget as Node)) setOpenOn(null); }}
    >
      <div className={cn("flex items-center rounded-lg transition-colors hover:bg-surface", open && "bg-surface")}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn("rounded-s-lg py-2 ps-3 pe-1 text-[15px] font-medium text-navy-900/80 hover:text-navy-900", active && "text-navy-900")}
        >
          {label}
        </Link>
        <button
          ref={btn}
          type="button"
          aria-expanded={open}
          aria-controls={id}
          aria-label={toggleLabel}
          onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
          onClick={() => {
            clear();
            // A mouse user who hovered in already sees the panel; their click shouldn't slam it shut.
            const hoverOpen = lastPointer.current === "mouse" && Date.now() - openedAt.current < 600;
            setOpenOn(open && !hoverOpen ? null : pathname);
            lastPointer.current = null;
          }}
          className="grid h-9 w-7 place-items-center rounded-e-lg text-navy-900/70 hover:text-navy-900"
        >
          <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>

      {/* pt-3 is an invisible bridge between trigger and panel so the hover isn't lost on the way down */}
      <div
        id={id}
        inert={!open}
        className={cn(
          "absolute top-full z-50 pt-3 transition duration-150 ease-out",
          align === "center" ? "start-1/2 -translate-x-1/2 rtl:translate-x-1/2" : "-start-4",
          open ? "visible opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <div className={cn(width, "overflow-hidden rounded-2xl bg-paper shadow-[var(--shadow-lift)] ring-1 ring-line")}>
          {children}
        </div>
      </div>
    </div>
  );
}
