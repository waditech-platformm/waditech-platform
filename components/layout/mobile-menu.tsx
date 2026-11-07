"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

export function MobileMenu({ links, footer }: { links: { href: string; label: string }[]; footer?: React.ReactNode }) {
  const { dict } = useI18n();
  const pathname = usePathname();
  // The menu is "open" only for the path it was opened on, so navigating closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) =>
    setOpenedOn((typeof v === "function" ? v(open) : v) ? pathname : null);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? dict.common.close : dict.common.menu}
        className="grid size-10 place-items-center rounded-xl text-navy-900 ring-1 ring-line hover:bg-surface"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 top-20 bottom-0 z-50 overflow-y-auto bg-paper px-4 pb-10 pt-4">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="border-b border-line py-3.5 text-base font-semibold text-navy-900">{l.label}</Link>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3">{footer}</div>
        </div>
      )}
    </div>
  );
}
