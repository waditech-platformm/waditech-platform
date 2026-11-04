import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";
import { isLocale, pick, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Badge, Container, DemoBadge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { listScholarships } from "@/features/content/queries";
export async function generateMetadata({ params }: PageProps<"/[locale]/scholarships">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en"); return { title: d.scholarships.title, description: d.scholarships.subtitle };
}
export default async function Scholarships({ params }: PageProps<"/[locale]/scholarships">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const items = await listScholarships();
  return (
    <>
      <PageHeader title={d.scholarships.title} subtitle={d.scholarships.subtitle} />
      <Container className="py-10">
        {items.length === 0 ? <EmptyState title={d.common.emptyTitle} /> : <div className="grid gap-6 md:grid-cols-2">{items.map((s) => (
          <Link key={s.id} href={`/${locale}/scholarships/${s.slug}`} className="rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-line shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]">
            <div className="flex items-center gap-2"><Award className="size-6 text-royal-600" aria-hidden /><Badge tone={s.status === "open" ? "success" : "neutral"}>{s.status}</Badge><DemoBadge show={s.is_test_data} label={d.common.demoBadge} /></div>
            <h2 className="mt-3 text-lg font-bold text-navy-900">{pick(s, "title", locale)}</h2>
            <p className="mt-1 text-sm text-muted">{pick(s, "description", locale)}</p>
            <p className="mt-3 text-xs text-subtle">{s.coverage_percent && <>{d.scholarships.coverage}: {s.coverage_percent}% · </>}{s.deadline && <>{d.scholarships.deadline}: {formatDate(s.deadline, locale)}</>}</p>
          </Link>
        ))}</div>}
      </Container>
    </>
  );
}
