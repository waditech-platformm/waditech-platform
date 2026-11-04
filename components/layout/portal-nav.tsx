"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
export function PortalNav({ items }: { items: { href: string; label: string; exact?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Section" className="-mb-px mt-6 flex gap-1 overflow-x-auto">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition", active ? "border-royal-600 text-royal-700" : "border-transparent text-muted hover:text-navy-900")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
