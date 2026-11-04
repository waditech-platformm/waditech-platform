import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { NewsCard } from "@/components/cards";
import { listNews } from "@/features/content/queries";
import { cn } from "@/lib/cn";

const CATS = ["news", "announcement", "article", "achievement"] as const;
export async function generateMetadata({ params }: PageProps<"/[locale]/news">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en");
  return { title: d.news.title, description: d.news.subtitle, alternates: { canonical: `/${locale}/news`, languages: { en: "/en/news", ar: "/ar/news" } } };
}
export default async function News({ params, searchParams }: PageProps<"/[locale]/news">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const sp = await searchParams;
  const category = typeof sp.category === "string" && (CATS as readonly string[]).includes(sp.category) ? sp.category : undefined;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : undefined;
  const items = await listNews({ category, q });
  const labels: Record<string, string> = locale === "ar" ? { news: "أخبار", announcement: "إعلانات", article: "مقالات", achievement: "إنجازات" } : { news: "News", announcement: "Announcements", article: "Articles", achievement: "Achievements" };
  return (
    <>
      <PageHeader title={d.news.title} subtitle={d.news.subtitle} />
      <Container className="py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/news`} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold ring-1", !category ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-line")}>{d.common.all}</Link>
            {CATS.map((c) => <Link key={c} href={`/${locale}/news?category=${c}`} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold ring-1", category === c ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-line")}>{labels[c]}</Link>)}
          </div>
          <form className="flex gap-2" role="search"><label htmlFor="nq" className="sr-only">{d.common.search}</label><Input id="nq" name="q" defaultValue={q} placeholder={d.common.search} className="sm:w-64" /><Button type="submit" variant="secondary">{d.common.search}</Button></form>
        </div>
        {items.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((a) => <NewsCard key={a.id} a={a} locale={locale} d={d} />)}</div> : <EmptyState title={d.news.empty} />}
      </Container>
    </>
  );
}
