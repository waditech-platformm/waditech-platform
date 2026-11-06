import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Clock, MapPin, Users, FlaskConical, ArrowUpRight, Star, GraduationCap } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatDateTime, formatMoney, pick } from "@/lib/i18n/config";
import type { Dict } from "@/messages/en";
import type { Course } from "@/features/catalog/queries";
import type { Article, EventRow, Lab } from "@/features/content/queries";
import { Badge, DemoBadge } from "@/components/ui/primitives";

export function priceLabel(c: Pick<Course, "price_amount" | "currency">, locale: Locale, d: Dict) {
  return Number(c.price_amount) > 0 ? formatMoney(Number(c.price_amount), c.currency, locale) : d.common.free;
}
const availTone = { open: "success", waitlist: "warning", closed: "neutral", coming_soon: "blue" } as const;

export type CardStats = { learners: number; rating: number | null; reviews: number };

/** Real learner count and approved rating; renders nothing when there is nothing real to show. */
export function CourseStatsLine({ s, d, locale, className = "" }: { s?: CardStats; d: Dict; locale: Locale; className?: string }) {
  if (!s || (s.learners === 0 && !s.reviews)) return null;
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-JO", { maximumFractionDigits: 1 });
  const c = d.community;
  return (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      {s.reviews > 0 && s.rating !== null && (
        <span className="inline-flex items-center gap-1 font-semibold text-navy-900">
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
          <span className="sr-only">{c.ratingOutOf.replace("{r}", nf.format(s.rating))}</span>
          <span aria-hidden>{nf.format(s.rating)}</span>
          <span className="font-normal text-subtle">({s.reviews === 1 ? c.reviewsCount1 : c.reviewsCountN.replace("{n}", nf.format(s.reviews))})</span>
        </span>
      )}
      {s.learners > 0 && <span className="text-subtle">{s.learners === 1 ? c.learners1 : c.learnersN.replace("{n}", nf.format(s.learners))}</span>}
    </span>
  );
}

export function CourseCard({ c, locale, d, stats }: { c: Course; locale: Locale; d: Dict; stats?: CardStats }) {
  return (
    <Link href={`/${locale}/programs/${c.slug}`} className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-line shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-navy-900">
        {c.thumbnail_url || c.cover_url ? (
          <Image src={(c.thumbnail_url || c.cover_url)!} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : <div className="bg-neural absolute inset-0" />}
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="dark" className="bg-navy-900/80 backdrop-blur">{d.enums.category[c.category as keyof Dict["enums"]["category"]]}</Badge>
          <DemoBadge show={c.is_test_data} label={d.common.demoBadge} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-navy-900 group-hover:text-royal-700">{pick(c, "title", locale)}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{pick(c, "summary", locale)}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-subtle">
          {c.age_min && <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden />{d.programs.ages} {c.age_min}–{c.age_max}</span>}
          {c.grade_min && c.grade_max && <span className="inline-flex items-center gap-1"><GraduationCap className="size-3.5" aria-hidden />{d.community.gradesRange.replace("{a}", String(c.grade_min)).replace("{b}", String(c.grade_max))}</span>}
          {c.duration_weeks && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{c.duration_weeks} {d.common.weeks}</span>}
          <span>{d.enums.level[c.level as keyof Dict["enums"]["level"]]}</span>
          <span>{d.enums.mode[c.delivery_mode as keyof Dict["enums"]["mode"]]}</span>
        </div>
        <CourseStatsLine s={stats} d={d} locale={locale} className="mt-3 text-xs" />
        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="text-base font-extrabold text-navy-900">{priceLabel(c, locale, d)}</span>
          <Badge tone={availTone[c.availability as keyof typeof availTone] ?? "neutral"}>{d.enums.availability[c.availability as keyof Dict["enums"]["availability"]]}</Badge>
        </div>
      </div>
    </Link>
  );
}

export function NewsCard({ a, locale, d }: { a: Article; locale: Locale; d: Dict }) {
  return (
    <Link href={`/${locale}/news/${a.slug}`} className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-line shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[16/9] bg-navy-900">
        {a.cover_url && <Image src={a.cover_url} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover" />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
          {a.published_at && <time dateTime={a.published_at}>{formatDate(a.published_at, locale)}</time>}
          <DemoBadge show={a.is_test_data} label={d.common.demoBadge} />
        </div>
        <h3 className="mt-2 font-bold leading-snug text-navy-900 group-hover:text-royal-700">{pick(a, "title", locale)}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{pick(a, "excerpt", locale)}</p>
      </div>
    </Link>
  );
}

export function EventCard({ e, locale, d }: { e: EventRow; locale: Locale; d: Dict }) {
  const date = new Date(e.starts_at);
  return (
    <Link href={`/${locale}/events/${e.slug}`} className="group flex gap-4 rounded-[var(--radius-card)] bg-white p-4 ring-1 ring-line shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lift)]">
      <div className="grid w-16 shrink-0 place-items-center rounded-xl bg-navy-900 py-2 text-center text-white">
        <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-300">{formatDate(date, locale, { month: "short" })}</span>
        <span className="text-2xl font-extrabold leading-none">{formatDate(date, locale, { day: "numeric" })}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-1.5"><DemoBadge show={e.is_test_data} label={d.common.demoBadge} />{e.status === "cancelled" && <Badge tone="danger">{d.events.status.cancelled}</Badge>}</div>
        <h3 className="mt-1 font-bold text-navy-900 group-hover:text-royal-700">{pick(e, "title", locale)}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-subtle"><CalendarDays className="size-3.5" aria-hidden />{formatDateTime(e.starts_at, locale)}</p>
        {pick(e, "location", locale) && <p className="mt-0.5 flex items-center gap-1 text-xs text-subtle"><MapPin className="size-3.5" aria-hidden />{pick(e, "location", locale)}</p>}
      </div>
    </Link>
  );
}

export function LabCard({ l, locale, d }: { l: Lab; locale: Locale; d: Dict }) {
  return (
    <Link href={`/${locale}/labs/${l.slug}`} className="group flex flex-col rounded-[var(--radius-card)] bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10">
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300"><FlaskConical className="size-5" aria-hidden /></span>
        <ArrowUpRight className="size-4 text-white/40 transition group-hover:text-cyan-300 rtl:-scale-x-100" aria-hidden />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-cyan-300">{d.enums.labCategory[l.category as keyof Dict["enums"]["labCategory"]]}</p>
      <h3 className="mt-1 font-bold text-white">{pick(l, "title", locale)}</h3>
      <p className="mt-1 text-sm text-white/70">{pick(l, "summary", locale)}</p>
    </Link>
  );
}
