import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, DemoBadge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { listTrainers } from "@/features/community/queries";
import { TrainerAvatar } from "@/features/community/trainer-avatar";

export async function generateMetadata({ params }: PageProps<"/[locale]/trainers">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en");
  return { title: d.community.trainersTitle, description: d.community.trainersSubtitle, alternates: { canonical: `/${locale}/trainers`, languages: { en: "/en/trainers", ar: "/ar/trainers" } } };
}

export default async function Trainers({ params }: PageProps<"/[locale]/trainers">) {
  const { locale: l } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const c = d.community;
  const cats = d.enums.category as Record<string, string>;
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-JO");
  const trainers = await listTrainers();
  return (
    <>
      <PageHeader title={c.trainersTitle} subtitle={c.trainersSubtitle} />
      <Container className="py-12 sm:py-16">
        {trainers.length === 0 ? <EmptyState title={c.trainersEmpty} /> : (
          <ul className="wt-stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trainers.map((t) => {
              const name = pick(t, "display_name", locale);
              return (
                <li key={t.trainer_id}>
                  <Link href={`/${locale}/trainers/${t.slug}`} className="group flex h-full flex-col rounded-[24px] bg-paper p-7 ring-1 ring-line transition-shadow hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-royal-100">
                    <span className="flex items-start justify-between gap-3">
                      <TrainerAvatar name={name} photo={t.photo_url} size={72} />
                      <DemoBadge show={t.is_test_data} label={d.common.demoBadge} />
                    </span>
                    <span className="mt-5 text-xl font-bold text-navy-900">{name}</span>
                    {pick(t, "headline", locale) && <span className="mt-1 text-sm text-muted">{pick(t, "headline", locale)}</span>}
                    {t.specialties.length > 0 && (
                      <span className="mt-4 flex flex-wrap gap-1.5">{t.specialties.map((s) => <span key={s} className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-navy-900 ring-1 ring-line">{cats[s] ?? s}</span>)}</span>
                    )}
                    <span className="mt-auto flex items-center justify-between pt-6 text-sm">
                      <span className="text-subtle">{nf.format(t.courses)} {c.coursesTaught} · {nf.format(t.learners)} {c.learnersTaught}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-royal-600">{c.viewProfile}<ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden /></span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </>
  );
}
