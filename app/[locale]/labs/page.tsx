import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, PageHeader } from "@/components/ui/primitives";
import { LabCard } from "@/components/cards";
import { listLabs } from "@/features/content/queries";
export async function generateMetadata({ params }: PageProps<"/[locale]/labs">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en");
  return { title: d.labs.title, description: d.labs.subtitle, alternates: { canonical: `/${locale}/labs` } };
}
export default async function Labs({ params }: PageProps<"/[locale]/labs">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const labs = await listLabs();
  const cats = [...new Set(labs.map((x) => x.category))];
  return (
    <>
      <PageHeader title={d.labs.title} subtitle={d.labs.subtitle} />
      <section className="bg-navy-900 py-10"><Container className="space-y-10">
        {cats.map((c) => (
          <div key={c}><h2 className="mb-4 text-lg font-bold text-white">{d.enums.labCategory[c as keyof typeof d.enums.labCategory]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{labs.filter((x) => x.category === c).map((x) => <LabCard key={x.id} l={x} locale={locale} d={d} />)}</div></div>
        ))}
      </Container></section>
    </>
  );
}
