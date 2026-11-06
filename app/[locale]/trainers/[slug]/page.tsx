import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, DemoBadge } from "@/components/ui/primitives";
import { CourseCard } from "@/components/cards";
import { listCourses } from "@/features/catalog/queries";
import { courseStats, getTrainer, trainerCourseIds } from "@/features/community/queries";
import { TrainerAvatar } from "@/features/community/trainer-avatar";

export async function generateMetadata({ params }: PageProps<"/[locale]/trainers/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const l: Locale = isLocale(locale) ? locale : "en";
  const t = await getTrainer(slug);
  if (!t) return {};
  return { title: pick(t, "display_name", l), description: pick(t, "headline", l) || undefined, alternates: { canonical: `/${l}/trainers/${slug}`, languages: { en: `/en/trainers/${slug}`, ar: `/ar/trainers/${slug}` } } };
}

export default async function TrainerPage({ params }: PageProps<"/[locale]/trainers/[slug]">) {
  const { locale: l, slug } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const c = d.community;
  const t = await getTrainer(slug);
  if (!t) notFound();
  const [ids, all, stats] = await Promise.all([trainerCourseIds(t.trainer_id), listCourses(), courseStats()]);
  const courses = all.filter((x) => ids.includes(x.id));
  const name = pick(t, "display_name", locale);
  const cats = d.enums.category as Record<string, string>;
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-JO");
  const facts = [
    { k: c.coursesTaught, v: nf.format(t.courses) },
    { k: c.learnersTaught, v: nf.format(t.learners) },
    ...(t.years_experience !== null ? [{ k: c.yearsExperience, v: nf.format(t.years_experience) }] : []),
  ];
  return (
    <>
      <section className="border-b border-line bg-white">
        <Container className="py-12 sm:py-16">
          <nav className="text-sm text-subtle"><Link href={`/${locale}/trainers`} className="hover:text-royal-600">{d.nav.trainers}</Link> / <span className="text-navy-900">{name}</span></nav>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <TrainerAvatar name={name} photo={t.photo_url} size={112} />
            <div>
              <DemoBadge show={t.is_test_data} label={d.common.demoBadge} />
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">{name}</h1>
              {pick(t, "headline", locale) && <p className="mt-2 text-lg text-muted">{pick(t, "headline", locale)}</p>}
            </div>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-line pt-6">
            {facts.map((f) => <div key={f.k} className="flex flex-col"><dt className="mt-1 text-sm text-muted">{f.k}</dt><dd className="order-first text-3xl font-bold text-navy-900 tabular-nums">{f.v}</dd></div>)}
          </dl>
        </Container>
      </section>
      <Container className="grid grid-cols-1 gap-12 py-12 [&>*]:min-w-0 sm:py-16 lg:grid-cols-[1fr_2fr]">
        <div>
          {pick(t, "bio", locale) && <p className="whitespace-pre-line text-lg leading-relaxed text-navy-900">{pick(t, "bio", locale)}</p>}
          {t.specialties.length > 0 && (
            <>
              <h2 className="mt-8 text-sm font-semibold text-muted">{c.specialties}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">{t.specialties.map((s) => <li key={s}><Link href={`/${locale}/programs?category=${s}`} className="inline-flex rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-navy-900 ring-1 ring-line hover:ring-royal-500">{cats[s] ?? s}</Link></li>)}</ul>
            </>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-navy-900">{c.programsByTrainer.replace("{name}", name)}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">{courses.map((x) => <CourseCard key={x.id} c={x} locale={locale} d={d} stats={stats.get(x.id)} />)}</div>
        </div>
      </Container>
    </>
  );
}
