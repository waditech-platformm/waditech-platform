import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { isLocale, pick, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Badge, Container, DemoBadge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { listCompetitions } from "@/features/content/queries";
export async function generateMetadata({ params }: PageProps<"/[locale]/competitions">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en"); return { title: d.competitions.title, description: d.competitions.subtitle };
}
export default async function Competitions({ params }: PageProps<"/[locale]/competitions">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const items = await listCompetitions();
  return (
    <>
      <PageHeader title={d.competitions.title} subtitle={d.competitions.subtitle} />
      <Container className="py-10">
        {items.length === 0 ? <EmptyState title={d.common.emptyTitle} /> : (
          <div className="grid gap-6 md:grid-cols-2">{items.map((c) => (
            <Link key={c.id} href={`/${locale}/competitions/${c.slug}`} className="group overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-line shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]">
              <div className="relative aspect-[16/8] bg-navy-900">{c.cover_url && <Image src={c.cover_url} alt="" fill sizes="50vw" className="object-cover" />}</div>
              <div className="p-5">
                <div className="flex gap-2"><Badge tone={c.status === "open" ? "success" : "neutral"}>{d.competitions.compStatus[c.status as keyof typeof d.competitions.compStatus]}</Badge><DemoBadge show={c.is_test_data} label={d.common.demoBadge} /></div>
                <h2 className="mt-2 text-lg font-bold text-navy-900 group-hover:text-royal-700">{pick(c, "title", locale)}</h2>
                <p className="mt-1 text-sm text-muted">{pick(c, "description", locale)}</p>
                <p className="mt-3 text-xs text-subtle">{c.registration_deadline && <>{d.competitions.deadline}: {formatDate(c.registration_deadline, locale)} · </>}{d.competitions.teamSize}: {c.team_min}–{c.team_max}</p>
              </div>
            </Link>
          ))}</div>
        )}
      </Container>
    </>
  );
}
