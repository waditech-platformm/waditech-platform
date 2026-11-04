import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, EmptyState, PageHeader } from "@/components/ui/primitives";
import { VideoTile } from "@/components/video-tile";
import { listMedia } from "@/features/content/queries";
import { cn } from "@/lib/cn";
const CATS = ["competition", "classroom", "projects", "labs"] as const;
export async function generateMetadata({ params }: PageProps<"/[locale]/gallery">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en"); return { title: d.gallery.title, description: d.gallery.subtitle };
}
export default async function Gallery({ params, searchParams }: PageProps<"/[locale]/gallery">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const sp = await searchParams;
  const cat = typeof sp.category === "string" && (CATS as readonly string[]).includes(sp.category) ? sp.category : undefined;
  const [photos, videos] = await Promise.all([listMedia({ kind: "image", category: cat, limit: 80 }), cat ? Promise.resolve([]) : listMedia({ kind: "video", limit: 12 })]);
  const chip = (active: boolean) => cn("rounded-full px-3 py-1.5 text-sm font-semibold ring-1", active ? "bg-navy-900 text-white ring-navy-900" : "bg-white ring-line");
  return (
    <>
      <PageHeader title={d.gallery.title} subtitle={d.gallery.subtitle} />
      <Container className="py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href={`/${locale}/gallery`} className={chip(!cat)}>{d.common.all}</Link>
          {CATS.map((c) => <Link key={c} href={`/${locale}/gallery?category=${c}`} className={chip(cat === c)}>{d.gallery.categories[c]}</Link>)}
        </div>
        {videos.length > 0 && (<section className="mb-10"><h2 className="mb-4 text-lg font-bold text-navy-900">{d.gallery.videos}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{videos.map((v) => <div key={v.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-navy-900"><VideoTile src={v.url} poster={v.poster_url} label={pick(v, "alt", locale)} className="absolute inset-0 size-full object-cover" /></div>)}</div></section>)}
        <h2 className="mb-4 text-lg font-bold text-navy-900">{d.gallery.photos}</h2>
        {photos.length === 0 ? <EmptyState title={d.common.emptyTitle} /> : (
          <div className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3">
            {photos.map((m) => (
              <a key={m.id} href={m.url} target="_blank" rel="noopener" className="block overflow-hidden rounded-2xl bg-navy-900">
                <Image src={m.url} alt={pick(m, "alt", locale)} width={m.width ?? 800} height={m.height ?? 600} sizes="(min-width:1024px) 25vw, 50vw" className="h-auto w-full transition hover:scale-[1.02]" />
              </a>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
