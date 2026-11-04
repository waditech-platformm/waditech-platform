import type { Metadata } from "next";
import { Globe, MapPin } from "lucide-react";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Card, Container, PageHeader } from "@/components/ui/primitives";
import { ContactForm } from "@/features/engagement/contact-form";
export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en"); return { title: d.contact.title, description: d.contact.subtitle };
}
export default async function Contact({ params, searchParams }: PageProps<"/[locale]/contact">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const topic = (await searchParams).topic;
  return (
    <>
      <PageHeader title={d.contact.title} subtitle={d.contact.subtitle} />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_320px]">
        <Card className="relative p-6 sm:p-8"><ContactForm topic={typeof topic === "string" ? topic : undefined} /></Card>
        <Card className="h-fit space-y-4 p-6 text-sm">
          <p className="flex items-center gap-2"><MapPin className="size-5 text-royal-600" aria-hidden />{d.footer.madeIn}</p>
          <p className="flex items-center gap-2"><Globe className="size-5 text-royal-600" aria-hidden /><a href="https://waditech.co" className="font-latin font-semibold text-royal-600">waditech.co</a></p>
        </Card>
      </Container>
    </>
  );
}
