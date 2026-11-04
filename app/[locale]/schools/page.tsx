import type { Metadata } from "next";
import Image from "next/image";
import { BarChart3, CalendarCheck, Users, FolderKanban } from "lucide-react";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Card, Container, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
export async function generateMetadata({ params }: PageProps<"/[locale]/schools">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en"); return { title: d.home.schoolsTitle, description: d.home.schoolsBody };
}
export default async function Schools({ params }: PageProps<"/[locale]/schools">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const items = [[Users, d.school.students], [CalendarCheck, d.school.attendanceRate], [BarChart3, d.school.avgProgress], [FolderKanban, d.school.projects]] as const;
  return (
    <>
      <PageHeader title={d.home.schoolsTitle} subtitle={d.home.schoolsBody} />
      <Container className="grid gap-10 py-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-xl font-bold text-navy-900">{d.school.title}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{items.map(([I, t]) => <Card key={t} className="flex items-center gap-3 p-5"><I className="size-6 text-royal-600" aria-hidden /><span className="font-semibold">{t}</span></Card>)}</div>
          <ButtonLink className="mt-6" href={`/${locale}/contact?topic=schools`} size="lg">{d.home.schoolsCta}</ButtonLink>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl"><Image src="/media/photos/classroom-58.webp" alt="" fill sizes="50vw" className="object-cover" /></div>
      </Container>
    </>
  );
}
