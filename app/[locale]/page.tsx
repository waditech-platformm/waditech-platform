import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, Cpu, GraduationCap, Hammer, Languages, School, Trophy, Award } from "lucide-react";
import { isLocale, pick, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, SectionHeading, Card, Badge, DemoBadge } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { CourseCard, NewsCard, EventCard, LabCard } from "@/components/cards";
import { VideoTile } from "@/components/video-tile";
import { featuredCourses } from "@/features/catalog/queries";
import { listCompetitions, listEvents, listLabs, listMedia, listNews, listScholarships, publicProjects } from "@/features/content/queries";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale: l } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const p = (s: string) => `/${locale}${s}`;
  const [courses, labs, events, news, comps, schols, projects, videos, photos] = await Promise.all([
    featuredCourses(6), listLabs(), listEvents("upcoming", 3), listNews({ limit: 3 }), listCompetitions(2), listScholarships(2),
    publicProjects(4), listMedia({ kind: "video", limit: 4 }), listMedia({ kind: "image", featured: true, limit: 4 }),
  ]);
  const arrow = <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;
  const why = [
    { icon: Hammer, t: d.home.why1Title, b: d.home.why1Body },
    { icon: Cpu, t: d.home.why2Title, b: d.home.why2Body },
    { icon: GraduationCap, t: d.home.why3Title, b: d.home.why3Body },
    { icon: Languages, t: d.home.why4Title, b: d.home.why4Body },
  ];

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="bg-neural relative overflow-hidden text-white">
        <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-300 ring-1 ring-white/15">
              <Bot className="size-3.5" aria-hidden />{d.home.heroEyebrow}
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">{d.home.heroTitle}</h1>
            <p className="mt-4 text-xl font-bold text-cyan-300 sm:text-2xl">{d.home.heroSubtitle}</p>
            <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">{d.home.heroBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={p("/programs")} variant="accent" size="lg">{d.home.ctaExplore}{arrow}</ButtonLink>
              <ButtonLink href={p("/about")} variant="onDark" size="lg">{d.home.ctaDiscover}</ButtonLink>
            </div>
          </div>
          <div className="relative">
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/15">
              <Image src="/media/brand/lab-entrance.webp" alt={locale === "ar" ? "مدخل مختبر الروبوتات للأطفال في وادي تك" : "Entrance of the WadiTech kids robotics lab"} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 start-4 w-36 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-cyan-500/40 sm:-bottom-8 sm:w-48 lg:-start-8">
              <Image src="/media/brand/logo-original.png" alt={d.meta.fullName} width={384} height={384} className="h-auto w-full" />
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- FEATURED PROGRAMS ---------- */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow={d.nav.programs} title={d.home.featuredTitle} subtitle={d.home.featuredSubtitle} action={<ButtonLink href={p("/programs")} variant="secondary">{d.common.viewAll}{arrow}</ButtonLink>} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c) => <CourseCard key={c.id} c={c} locale={locale} d={d} />)}</div>
        </Container>
      </section>

      {/* ---------- LEARNING IN ACTION ---------- */}
      <section className="bg-white py-16 sm:py-20">
        <Container>
          <SectionHeading title={d.home.actionTitle} subtitle={d.home.actionSubtitle} action={<ButtonLink href={p("/gallery")} variant="secondary">{d.nav.gallery}{arrow}</ButtonLink>} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {videos.map((v) => (
              <div key={v.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-navy-900">
                <VideoTile src={v.url} poster={v.poster_url} label={pick(v, "alt", locale)} className="absolute inset-0 size-full object-cover" />
              </div>
            ))}
            {photos.slice(0, Math.max(0, 4 - videos.length)).map((m) => (
              <div key={m.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl"><Image src={m.url} alt={pick(m, "alt", locale)} fill sizes="25vw" className="object-cover" /></div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- WHY + LAB SPACE (user-supplied classroom image) ---------- */}
      <section className="py-16 sm:py-20">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl shadow-[var(--shadow-lift)]">
            <Image src="/media/brand/lab-classroom.webp" alt={locale === "ar" ? "محطات البرمجة والروبوتات داخل مختبر وادي تك" : "Coding and robotics workstations inside the WadiTech lab"} fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/90 to-transparent p-6 text-white">
              <p className="text-lg font-bold">{d.home.labSpaceTitle}</p>
              <p className="mt-1 max-w-md text-sm text-white/80">{d.home.labSpaceBody}</p>
            </div>
          </div>
          <div>
            <SectionHeading eyebrow={d.meta.siteName} title={d.home.whyTitle} subtitle={d.home.whySubtitle} className="mb-6" />
            <div className="grid gap-4 sm:grid-cols-2">
              {why.map((w) => (
                <Card key={w.t} className="p-5">
                  <w.icon className="size-6 text-royal-600" aria-hidden />
                  <p className="mt-3 font-bold text-navy-900">{w.t}</p>
                  <p className="mt-1 text-sm text-muted">{w.b}</p>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- LABS ---------- */}
      <section className="bg-neural py-16 text-white sm:py-20">
        <Container>
          <SectionHeading onDark eyebrow={d.nav.labs} title={d.home.labsTitle} subtitle={d.home.labsSubtitle} action={<ButtonLink href={p("/labs")} variant="onDark">{d.common.viewAll}{arrow}</ButtonLink>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{labs.slice(0, 6).map((x) => <LabCard key={x.id} l={x} locale={locale} d={d} />)}</div>
        </Container>
      </section>

      {/* ---------- SCHOOLS ---------- */}
      <section className="py-16 sm:py-20">
        <Container>
          <Card className="grid overflow-hidden lg:grid-cols-2">
            <div className="p-8 sm:p-10">
              <School className="size-8 text-royal-600" aria-hidden />
              <h2 className="mt-4 text-2xl font-extrabold text-navy-900 sm:text-3xl">{d.home.schoolsTitle}</h2>
              <p className="mt-3 text-muted">{d.home.schoolsBody}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={p("/contact?topic=schools")}>{d.home.schoolsCta}{arrow}</ButtonLink>
                <ButtonLink href={p("/schools")} variant="secondary">{d.common.learnMore}</ButtonLink>
              </div>
            </div>
            <div className="relative min-h-64"><Image src="/media/photos/classroom-41.webp" alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" /></div>
          </Card>
        </Container>
      </section>

      {/* ---------- COMPETITIONS & SCHOLARSHIPS ---------- */}
      <section className="bg-white py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading title={d.home.competitionsTitle} subtitle={d.home.competitionsSubtitle} action={<Link className="text-sm font-semibold text-royal-600" href={p("/competitions")}>{d.common.viewAll}</Link>} />
            <div className="space-y-4">
              {comps.map((c) => (
                <Link key={c.id} href={p(`/competitions/${c.slug}`)} className="flex gap-4 rounded-2xl p-3 ring-1 ring-line transition hover:ring-royal-500">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-navy-900">{c.cover_url && <Image src={c.cover_url} alt="" fill sizes="96px" className="object-cover" />}</div>
                  <div className="min-w-0">
                    <div className="flex gap-1.5"><Badge tone="cyan"><Trophy className="size-3" aria-hidden />{d.competitions.compStatus[c.status as keyof Dict["competitions"]["compStatus"]]}</Badge><DemoBadge show={c.is_test_data} label={d.common.demoBadge} /></div>
                    <p className="mt-1.5 font-bold text-navy-900">{pick(c, "title", locale)}</p>
                    {c.registration_deadline && <p className="text-xs text-subtle">{d.competitions.deadline}: {formatDate(c.registration_deadline, locale)}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading title={d.home.scholarshipsTitle} subtitle={d.home.scholarshipsSubtitle} action={<Link className="text-sm font-semibold text-royal-600" href={p("/scholarships")}>{d.common.viewAll}</Link>} />
            <div className="space-y-4">
              {schols.map((s) => (
                <Link key={s.id} href={p(`/scholarships/${s.slug}`)} className="block rounded-2xl bg-gradient-to-br from-royal-600 to-navy-800 p-6 text-white transition hover:shadow-[var(--shadow-lift)]">
                  <div className="flex items-center gap-2"><Award className="size-5 text-cyan-300" aria-hidden /><DemoBadge show={s.is_test_data} label={d.common.demoBadge} /></div>
                  <p className="mt-3 text-lg font-bold">{pick(s, "title", locale)}</p>
                  <p className="mt-1 text-sm text-white/80">{pick(s, "description", locale)}</p>
                  {s.coverage_percent && <p className="mt-3 text-sm font-semibold text-cyan-300">{d.scholarships.coverage}: {s.coverage_percent}%</p>}
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- NEWS + EVENTS ---------- */}
      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <SectionHeading title={d.home.newsTitle} action={<Link className="text-sm font-semibold text-royal-600" href={p("/news")}>{d.common.viewAll}</Link>} />
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{news.map((a) => <NewsCard key={a.id} a={a} locale={locale} d={d} />)}</div>
          </div>
          <div>
            <SectionHeading title={d.home.eventsTitle} action={<Link className="text-sm font-semibold text-royal-600" href={p("/events")}>{d.common.viewAll}</Link>} />
            <div className="space-y-3">{events.length ? events.map((e) => <EventCard key={e.id} e={e} locale={locale} d={d} />) : <p className="text-sm text-muted">{d.events.empty}</p>}</div>
          </div>
        </Container>
      </section>

      {/* ---------- STUDENT PROJECTS ---------- */}
      {projects.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <Container>
            <SectionHeading title={d.home.projectsTitle} subtitle={d.home.projectsSubtitle} action={<Link className="text-sm font-semibold text-royal-600" href={p("/projects")}>{d.common.viewAll}</Link>} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {projects.map((pr) => (
                <Card key={pr.id} className="overflow-hidden">
                  <div className="relative aspect-[4/3] bg-navy-900">{pr.cover_url && <Image src={pr.cover_url} alt="" fill sizes="25vw" className="object-cover" />}</div>
                  <div className="p-4">
                    <DemoBadge show={pr.is_test_data} label={d.common.demoBadge} />
                    <p className="mt-1 font-bold text-navy-900">{pr.title}</p>
                    <p className="text-xs text-subtle">{d.projects.by} {pr.student_first_name}</p>
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ---------- GALLERY STRIP ---------- */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading title={d.home.galleryTitle} action={<ButtonLink href={p("/gallery")} variant="secondary">{d.common.viewAll}{arrow}</ButtonLink>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((m, i) => (
              <div key={m.id} className={`relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : "aspect-square"}`}>
                <Image src={m.url} alt={pick(m, "alt", locale)} fill sizes={i === 0 ? "50vw" : "25vw"} className="object-cover" />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ---------- PARTNERS / TESTIMONIALS (honest empty states) ---------- */}
      <section className="bg-white py-14">
        <Container className="grid gap-6 md:grid-cols-2">
          <div><h2 className="text-xl font-bold text-navy-900">{d.home.partnersTitle}</h2><p className="mt-2 text-sm text-muted">{d.home.partnersEmpty}</p></div>
          <div className="text-sm text-muted md:text-end"><p>{d.home.testimonialsNote}</p></div>
        </Container>
      </section>

      {/* ---------- CONTACT CTA ---------- */}
      <section className="py-16">
        <Container>
          <div className="bg-neural flex flex-col items-start gap-6 rounded-3xl p-8 text-white sm:p-12 md:flex-row md:items-center md:justify-between">
            <div><h2 className="text-2xl font-extrabold sm:text-3xl">{d.home.contactTitle}</h2><p className="mt-2 text-white/80">{d.home.contactBody}</p></div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={p("/contact")} variant="accent" size="lg">{d.nav.contact}</ButtonLink>
              <ButtonLink href={p("/register")} variant="onDark" size="lg">{d.nav.register}</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
type Dict = ReturnType<typeof getDict>;
