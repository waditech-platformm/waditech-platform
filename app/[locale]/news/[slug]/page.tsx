import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, DemoBadge } from "@/components/ui/primitives";
import { Markdown } from "@/components/markdown";
import { NewsCard } from "@/components/cards";
import { getArticle, listNews } from "@/features/content/queries";

export async function generateMetadata({ params }: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params; const l: Locale = isLocale(locale) ? locale : "en";
  const a = await getArticle(slug); if (!a) return {};
  return { title: a.seo_title || pick(a, "title", l), description: a.seo_description || pick(a, "excerpt", l),
    alternates: { canonical: `/${l}/news/${slug}`, languages: { en: `/en/news/${slug}`, ar: `/ar/news/${slug}` } },
    openGraph: { type: "article", images: a.cover_url ? [a.cover_url] : undefined, publishedTime: a.published_at ?? undefined } };
}
export default async function Article({ params }: PageProps<"/[locale]/news/[slug]">) {
  const { locale: l, slug } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const a = await getArticle(slug);
  if (!a || a.status !== "published") notFound();
  const more = (await listNews({ limit: 4 })).filter((x) => x.id !== a.id).slice(0, 3);
  const ld = { "@context": "https://schema.org", "@type": "NewsArticle", headline: a.title_en, datePublished: a.published_at, image: a.cover_url, publisher: { "@type": "Organization", name: "WadiTech Academy" } };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Container className="max-w-3xl py-10">
        <Link href={`/${locale}/news`} className="text-sm font-semibold text-royal-600">← {d.news.title}</Link>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-subtle">{a.published_at && <time dateTime={a.published_at}>{formatDate(a.published_at, locale, { dateStyle: "long" })}</time>}<DemoBadge show={a.is_test_data} label={d.common.demoBadge} /></div>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-navy-900 sm:text-4xl">{pick(a, "title", locale)}</h1>
        <p className="mt-3 text-lg text-muted">{pick(a, "excerpt", locale)}</p>
      </Container>
      {a.cover_url && <Container className="max-w-5xl"><div className="relative aspect-[16/8] overflow-hidden rounded-3xl"><Image src={a.cover_url} alt="" fill priority sizes="(min-width:1024px) 1024px, 100vw" className="object-cover" /></div></Container>}
      <Container className="max-w-3xl py-10"><Markdown source={pick(a, "body", locale)} className="text-[17px]" /></Container>
      {more.length > 0 && <section className="bg-paper py-12"><Container><h2 className="mb-6 text-xl font-bold text-navy-900">{d.news.related}</h2><div className="wt-stagger grid gap-6 sm:grid-cols-3">{more.map((x) => <NewsCard key={x.id} a={x} locale={locale} d={d} />)}</div></Container></section>}
    </article>
  );
}
