"use client";
import { useId, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { cn } from "@/lib/cn";

type School = { id: string; name: string; name_ar: string | null; city: string | null; is_test_data: boolean };

/** Arabic-aware fold so "أ/إ/آ" match "ا", and case doesn't matter. */
const fold = (s: string) => s.toLocaleLowerCase().normalize("NFKD").replace(/[ً-ٰٟ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");

/**
 * Names of partner schools, used in the header "Schools" flyout and on /schools.
 * A search box appears once the list is long enough to need one.
 */
export function SchoolList({
  schools, locale, filterLabel, emptyLabel, demoLabel, columns = 2, searchAt = 9, className,
}: {
  schools: School[]; locale: string; filterLabel: string; emptyLabel: string; demoLabel: string; columns?: 2 | 3; searchAt?: number; className?: string;
}) {
  const [q, setQ] = useState("");
  const id = useId();
  const name = (s: School) => (locale === "ar" && s.name_ar ? s.name_ar : s.name);
  const shown = useMemo(() => {
    const f = fold(q.trim());
    if (!f) return schools;
    return schools.filter((s) => fold(`${s.name} ${s.name_ar ?? ""} ${s.city ?? ""}`).includes(f));
  }, [q, schools]);

  return (
    <div className={className}>
      {schools.length >= searchAt && (
        <div className="relative mt-3">
          <label htmlFor={id} className="sr-only">{filterLabel}</label>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={filterLabel} autoComplete="off"
            className="h-9 w-full rounded-lg bg-surface ps-9 pe-3 text-sm text-ink ring-1 ring-line placeholder:text-subtle focus:bg-paper focus:outline-none focus:ring-2 focus:ring-royal-500"
          />
        </div>
      )}
      <ul className={cn("mt-3 grid max-h-72 gap-x-4 overflow-y-auto overscroll-contain", columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")} aria-live="polite">
        {shown.map((s) => (
          <li key={s.id} className="flex min-w-0 items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-royal-50">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-500" />
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-snug text-navy-900">
                {name(s)}
                {s.is_test_data && <span className="ms-1.5 rounded bg-warning-bg px-1 py-px align-middle text-[10px] font-bold text-warning">{demoLabel}</span>}
              </span>
              {s.city && <span className="mt-0.5 flex items-center gap-1 text-xs text-subtle"><MapPin className="size-3" aria-hidden />{s.city}</span>}
            </span>
          </li>
        ))}
        {shown.length === 0 && <li className="px-2 py-1.5 text-sm text-muted">{emptyLabel.replace("{q}", q.trim())}</li>}
      </ul>
    </div>
  );
}
