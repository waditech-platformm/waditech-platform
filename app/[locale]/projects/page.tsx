import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Card, Container, DemoBadge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { publicProjects } from "@/features/content/queries";
export async function generateMetadata({ params }: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en"); return { title: d.projects.title, description: d.projects.subtitle };
}
export default async function Projects({ params }: PageProps<"/[locale]/projects">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const items = await publicProjects(48);
  return (
    <>
      <PageHeader title={d.projects.title} subtitle={d.projects.subtitle} />
      <Container className="py-10">
        {items.length === 0 ? <EmptyState title={d.projects.empty} /> : <div className="wt-stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-deep-900">{p.cover_url && <Image src={p.cover_url} alt="" fill sizes="33vw" className="object-cover" />}</div>
            <div className="p-5">
              <DemoBadge show={p.is_test_data} label={d.common.demoBadge} />
              <h2 className="mt-1 font-bold text-navy-900">{p.title}</h2>
              <p className="mt-1 text-sm text-muted">{p.description}</p>
              <p className="mt-3 text-xs text-subtle">{d.projects.by} {p.student_first_name}{p.course_title_en && <> · {pick(p, "course_title", locale)}</>}</p>
              {p.link_url && <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-royal-600">{d.projects.open}<ExternalLink className="size-3.5" aria-hidden /></a>}
            </div>
          </Card>
        ))}</div>}
      </Container>
    </>
  );
}
