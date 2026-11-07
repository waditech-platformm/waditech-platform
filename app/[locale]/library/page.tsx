import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Link2, Lock, PlayCircle, ClipboardList, Code2, ArrowUpRight } from "lucide-react";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, DemoBadge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { libraryItems } from "@/features/community/queries";

const CATS = ["robotics", "ai", "programming", "cybersecurity", "electronics", "embedded", "iot", "drones", "3d_printing", "stem"] as const;
const KINDS = ["pdf", "video", "worksheet", "link", "code"] as const;
const icons = { pdf: FileText, video: PlayCircle, worksheet: ClipboardList, link: Link2, code: Code2 } as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/library">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en");
  return { title: d.community.libraryTitle, description: d.community.librarySubtitle, alternates: { canonical: `/${locale}/library`, languages: { en: "/en/library", ar: "/ar/library" } } };
}

export default async function Library({ params, searchParams }: PageProps<"/[locale]/library">) {
  const { locale: l } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const c = d.community;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const category = (CATS as readonly string[]).includes(one("category")) ? one("category") : undefined;
  const kind = (KINDS as readonly string[]).includes(one("kind")) ? one("kind") : undefined;
  const g = Number(one("grade"));
  const grade = g >= 1 && g <= 12 ? g : undefined;
  const items = await libraryItems({ category, grade, kind });
  const cats = d.enums.category as Record<string, string>;
  const kinds = c.kinds as Record<string, string>;
  const grades = (a: number | null, b: number | null) => (a && b ? (a === b ? c.gradeN.replace("{n}", String(a)) : c.gradesRange.replace("{a}", String(a)).replace("{b}", String(b))) : null);
  return (
    <>
      <PageHeader title={c.libraryTitle} subtitle={c.librarySubtitle} />
      <Container className="py-10">
        <form method="get" role="search" className="grid gap-3 rounded-2xl bg-paper p-4 ring-1 ring-line sm:grid-cols-[repeat(3,1fr)_auto] sm:items-end">
          <div><Label htmlFor="category">{d.programs.category}</Label>
            <Select id="category" name="category" defaultValue={category ?? ""}><option value="">{d.common.all}</option>{CATS.map((x) => <option key={x} value={x}>{cats[x]}</option>)}</Select></div>
          <div><Label htmlFor="grade">{c.grade}</Label>
            <Select id="grade" name="grade" defaultValue={grade ? String(grade) : ""}><option value="">{d.common.all}</option>{Array.from({ length: 12 }, (_, i) => i + 1).map((x) => <option key={x} value={x}>{c.gradeN.replace("{n}", String(x))}</option>)}</Select></div>
          <div><Label htmlFor="kind">{c.kind}</Label>
            <Select id="kind" name="kind" defaultValue={kind ?? ""}><option value="">{d.common.all}</option>{KINDS.map((x) => <option key={x} value={x}>{kinds[x]}</option>)}</Select></div>
          <Button type="submit">{d.common.filter}</Button>
        </form>
        {items.length === 0 ? <div className="mt-8"><EmptyState title={c.libraryEmpty} /></div> : (
          <ul className="wt-stagger mt-8 divide-y divide-line overflow-hidden rounded-[24px] bg-paper ring-1 ring-line">
            {items.map((r) => {
              const Icon = icons[r.kind as keyof typeof icons] ?? FileText;
              const meta = [kinds[r.kind], r.category ? cats[r.category] : null, grades(r.grade_min, r.grade_max)].filter(Boolean).join(" · ");
              return (
                <li key={r.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                  <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${r.unlocked ? "bg-royal-50 text-royal-700" : "bg-surface text-subtle"}`}><Icon className="size-5" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-navy-900">{pick(r, "title", locale)}<DemoBadge show={r.is_test_data} label={d.common.demoBadge} /></p>
                    {pick(r, "description", locale) && <p className="mt-1 text-sm text-muted">{pick(r, "description", locale)}</p>}
                    <p className="mt-1.5 text-xs text-subtle">{meta}{r.course_slug && <> · <Link className="text-royal-600 underline underline-offset-2" href={`/${locale}/programs/${r.course_slug}`}>{pick({ title_en: r.course_title_en ?? "", title_ar: r.course_title_ar ?? "" }, "title", locale)}</Link></>}</p>
                  </div>
                  {r.unlocked && r.url ? (
                    <a href={r.url} target={r.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-action-hover">
                      {c.open}<ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden /><span className="sr-only">: {pick(r, "title", locale)}</span>
                    </a>
                  ) : r.access === "registered" ? (
                    <Link href={`/${locale}/login?next=/${locale}/library`} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-navy-900 ring-1 ring-line hover:bg-surface"><Lock className="size-4" aria-hidden />{c.lockedRegistered}</Link>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm text-subtle"><Lock className="size-4" aria-hidden />{c.lockedEnrolled}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </>
  );
}
