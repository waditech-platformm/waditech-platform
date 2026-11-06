import type { Metadata } from "next";
import Image from "next/image";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Alert, Card, Container, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en"); return { title: d.about.title, description: d.about.lead };
}
export default async function About({ params }: PageProps<"/[locale]/about">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  return (
    <>
      <PageHeader title={d.about.title} subtitle={d.about.lead} />
      <Container className="grid gap-10 py-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <Card className="p-6"><h2 className="text-xl font-bold text-navy-900">{d.about.missionTitle}</h2><p className="mt-2 leading-relaxed text-muted">{d.about.mission}</p></Card>
          <Card className="p-6"><h2 className="text-xl font-bold text-navy-900">{d.about.approachTitle}</h2><p className="mt-2 leading-relaxed text-muted">{d.about.approach}</p></Card>
          <Alert tone="info">{d.about.note}</Alert>
          <div className="flex flex-wrap gap-3"><ButtonLink href={`/${locale}/programs`}>{d.home.ctaExplore}</ButtonLink><ButtonLink href={`/${locale}/contact`} variant="secondary">{d.nav.contact}</ButtonLink></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-3xl"><Image src="/media/brand/lab-entrance.webp" alt="" fill sizes="50vw" className="object-cover" /></div>
          <div className="relative aspect-[3/2] bg-black"><Image src="/media/brand/logo-original-960.png" alt={d.meta.fullName} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-contain" /></div>
          <div className="relative aspect-[3/2] overflow-hidden rounded-3xl"><Image src="/media/brand/lab-classroom-md.webp" alt="" fill sizes="25vw" className="object-cover" /></div>
        </div>
      </Container>
    </>
  );
}
