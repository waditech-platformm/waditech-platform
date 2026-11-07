import type { Metadata } from "next";
import Image from "next/image";
import { BarChart3, CalendarCheck, Users, FolderKanban } from "lucide-react";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Card, Container, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { partnerSchools } from "@/features/navigation/queries";
import { SchoolList } from "@/components/layout/school-list";
export async function generateMetadata({ params }: PageProps<"/[locale]/schools">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en"); return { title: d.home.schoolsTitle, description: d.home.schoolsBody };
}
export default async function Schools({ params }: PageProps<"/[locale]/schools">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const items = [[Users, d.school.students], [CalendarCheck, d.school.attendanceRate], [BarChart3, d.school.avgProgress], [FolderKanban, d.school.projects]] as const;
  const schools = await partnerSchools();
  /*
   * TODO(launch): "ADD YOUR SCHOOL". Today a school asks to join through the contact form (topic=schools), and an admin
   * creates the organization in /admin/schools, then ticks "List on public site" once the school agrees.
   * A self-serve version would add: a school request form (school name, city, coordinator name/email/phone, grades,
   * student count, consent-to-be-listed checkbox) saving to a new school_requests table (migration + RLS: insert via
   * server action only, admin read), an admin approve button that creates the organization + invites the coordinator,
   * and an email to the partnerships inbox (see the EMAIL notes in features/engagement/actions.ts).
   */
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-JO");
  return (
    <>
      <PageHeader title={d.home.schoolsTitle} subtitle={d.home.schoolsBody} />
      <Container className="grid gap-10 py-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-xl font-bold text-navy-900">{d.school.title}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{items.map(([I, t]) => <Card key={t} className="flex items-center gap-3 p-5"><I className="size-6 text-royal-600" aria-hidden /><span className="font-semibold">{t}</span></Card>)}</div>
          <ButtonLink className="mt-6" href={`/${locale}/contact?topic=schools`} size="lg">{d.home.schoolsCta}</ButtonLink>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl"><Image src="/media/photos/classroom-58.webp" alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /></div>
      </Container>

      <section aria-labelledby="partner-schools" className="border-t border-line bg-paper py-14">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="partner-schools" className="text-2xl font-bold tracking-tight text-navy-900">{d.nav.partnerSchools}</h2>
              {schools.length > 0 && <p className="mt-1 text-sm text-muted">{schools.length === 1 ? d.nav.partnerSchools1 : d.nav.partnerSchoolsN.replace("{n}", nf.format(schools.length))}</p>}
            </div>
          </div>
          {schools.length > 0 ? (
            <SchoolList schools={schools} locale={locale} columns={3} searchAt={7} filterLabel={d.nav.filterSchools} emptyLabel={d.nav.noSchoolMatch} demoLabel={d.common.demoBadge} className="mt-4 max-w-5xl [&_ul]:max-h-none" />
          ) : (
            <p className="mt-3 max-w-xl text-muted">{d.nav.partnerSchoolsEmpty}</p>
          )}
        </Container>
      </section>
    </>
  );
}
