"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams();
  const target = locale === "en" ? "ar" : "en";
  const rest = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
  const qs = search.toString();
  return (
    <Link
      href={`/${target}${rest}${qs ? `?${qs}` : ""}`}
      hrefLang={target}
      prefetch={false}
      lang={target}
      aria-label={`${dict.common.language}: ${dict.common.languageLabel}`}
      className={cn("inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-navy-900 ring-1 ring-line hover:bg-surface", className)}
    >
      <Languages className="size-4" aria-hidden />
      <span className={target === "en" ? "font-latin" : ""}>{dict.common.language}</span>
    </Link>
  );
}
