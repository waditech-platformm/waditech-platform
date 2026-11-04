import type { Metadata } from "next";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Container, EmptyState, PageHeader } from "@/components/ui/primitives";
import { Input, Select, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/cards";
import { listCourses } from "@/features/catalog/queries";

const CATS = ["robotics", "ai", "programming", "cybersecurity", "electronics", "embedded", "iot", "drones", "3d_printing", "stem"] as const;
const AGES = [["", ""], ["8", "8"], ["10", "10"], ["12", "12"], ["14", "14"], ["16", "16"]] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/programs">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en");
  return { title: d.programs.title, description: d.programs.subtitle, alternates: { canonical: `/${locale}/programs`, languages: { en: "/en/programs", ar: "/ar/programs" } } };
}

export default async function Programs({ params, searchParams }: PageProps<"/[locale]/programs">) {
  const { locale: l } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const f = { category: one("category"), level: one("level"), mode: one("mode"), availability: one("availability"), age: Number(one("age")) || undefined, q: one("q") };
  const safe = {
    category: (CATS as readonly string[]).includes(f.category) ? f.category : undefined,
    level: ["beginner", "intermediate", "advanced"].includes(f.level) ? f.level : undefined,
    mode: ["in_person", "online", "hybrid"].includes(f.mode) ? f.mode : undefined,
    availability: ["open", "waitlist", "closed", "coming_soon"].includes(f.availability) ? f.availability : undefined,
    age: f.age && f.age >= 4 && f.age <= 99 ? f.age : undefined,
    q: f.q.slice(0, 60) || undefined,
  };
  const courses = await listCourses(safe);
  const active = Object.values(safe).some(Boolean);
  return (
    <>
      <PageHeader title={d.programs.title} subtitle={d.programs.subtitle} />
      <Container className="py-10">
        <form method="get" className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(5,1fr)_auto] lg:items-end" role="search">
          <div><Label htmlFor="q">{d.common.search}</Label><Input id="q" name="q" defaultValue={safe.q} placeholder={d.common.search} /></div>
          <div><Label htmlFor="category">{d.programs.category}</Label>
            <Select id="category" name="category" defaultValue={safe.category ?? ""}><option value="">{d.common.all}</option>{CATS.map((c) => <option key={c} value={c}>{d.enums.category[c]}</option>)}</Select></div>
          <div><Label htmlFor="age">{d.programs.ageGroup}</Label>
            <Select id="age" name="age" defaultValue={safe.age ? String(safe.age) : ""}>{AGES.map(([v]) => <option key={v} value={v}>{v ? `${v} ${d.common.years}` : d.common.all}</option>)}</Select></div>
          <div><Label htmlFor="level">{d.programs.level}</Label>
            <Select id="level" name="level" defaultValue={safe.level ?? ""}><option value="">{d.common.all}</option>{(["beginner", "intermediate", "advanced"] as const).map((v) => <option key={v} value={v}>{d.enums.level[v]}</option>)}</Select></div>
          <div><Label htmlFor="mode">{d.programs.mode}</Label>
            <Select id="mode" name="mode" defaultValue={safe.mode ?? ""}><option value="">{d.common.all}</option>{(["in_person", "online", "hybrid"] as const).map((v) => <option key={v} value={v}>{d.enums.mode[v]}</option>)}</Select></div>
          <div><Label htmlFor="availability">{d.programs.availability}</Label>
            <Select id="availability" name="availability" defaultValue={safe.availability ?? ""}><option value="">{d.common.all}</option>{(["open", "waitlist", "closed", "coming_soon"] as const).map((v) => <option key={v} value={v}>{d.enums.availability[v]}</option>)}</Select></div>
          <Button type="submit" className="lg:mb-0">{d.common.filter}</Button>
        </form>
        <div className="mt-6 flex items-center justify-between text-sm text-muted">
          <p aria-live="polite"><span className="font-bold text-navy-900">{courses.length}</span> {d.programs.results}</p>
          {active && <Link href={`/${locale}/programs`} className="font-semibold text-royal-600">{d.common.clearFilters}</Link>}
        </div>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c) => <CourseCard key={c.id} c={c} locale={locale} d={d} />)}</div>
        {courses.length === 0 && <EmptyState title={d.programs.noResults} action={<Link href={`/${locale}/programs`} className="font-semibold text-royal-600">{d.common.clearFilters}</Link>} />}
      </Container>
    </>
  );
}
