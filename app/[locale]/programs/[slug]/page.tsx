import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Users, Signal, MonitorSmartphone, PlayCircle, FileText, HelpCircle, ClipboardList, FlaskConical, Lock } from "lucide-react";
import { isLocale, pick, pickArr, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Badge, Card, Container, DemoBadge, SectionHeading } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CourseCard, priceLabel } from "@/components/cards";
import { VideoTile } from "@/components/video-tile";
import { getCourseBySlug, getCourseOutline, getCourseTrainers, listCourses, seatsTaken } from "@/features/catalog/queries";
import { enrollAction } from "@/features/enrollments/actions";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listMedia } from "@/features/content/queries";
import { env } from "@/lib/env";

const lessonIcon = { video: PlayCircle, text: FileText, resource: FileText, quiz: HelpCircle, assignment: ClipboardList, lab: FlaskConical } as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/programs/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const l: Locale = isLocale(locale) ? locale : "en";
  const c = await getCourseBySlug(slug);
  if (!c) return {};
  return {
    title: pick(c, "title", l),
    description: pick(c, "summary", l),
    alternates: { canonical: `/${l}/programs/${slug}`, languages: { en: `/en/programs/${slug}`, ar: `/ar/programs/${slug}` } },
    openGraph: { images: c.cover_url ? [c.cover_url] : undefined },
  };
}

export default async function ProgramDetail({ params }: PageProps<"/[locale]/programs/[slug]">) {
  const { locale: l, slug } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const c = await getCourseBySlug(slug);
  if (!c || c.status !== "published") notFound();
  const [outline, trainers, taken, viewer, related, media] = await Promise.all([
    getCourseOutline(c.id), getCourseTrainers(c.id), seatsTaken(c.id), getViewer(),
    listCourses({ category: c.category }), listMedia({ kind: "image", category: "projects", limit: 4 }),
  ]);
  const supabase = await createClient();
  let enrollment: { id: string; status: string } | null = null;
  let pendingOrder: string | null = null;
  if (viewer) {
    const { data } = await supabase.from("enrollments").select("id, status").eq("course_id", c.id).eq("student_id", viewer.id).maybeSingle();
    enrollment = data;
    if (data?.status === "pending_payment") {
      const { data: o } = await supabase.from("orders").select("id").eq("enrollment_id", data.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
      pendingOrder = o?.id ?? null;
    }
  }
  const seatsLeft = c.capacity ? Math.max(0, c.capacity - taken) : null;
  const lessonCount = outline.reduce((n, m) => n + m.lessons.length, 0);
  const isStudent = viewer?.roles.includes("student");
  const p = (s: string) => `/${locale}${s}`;
  const outcomes = pickArr(c, "outcomes", locale);
  const reqs = pickArr(c, "requirements", locale);
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Course", name: c.title_en, description: c.summary_en,
    provider: { "@type": "EducationalOrganization", name: "WadiTech Academy for AI & Robotics", sameAs: "https://waditech.co" },
    inLanguage: ["en", "ar"], url: `${env().NEXT_PUBLIC_SITE_URL}/${locale}/programs/${c.slug}`,
    offers: { "@type": "Offer", price: Number(c.price_amount), priceCurrency: c.currency, category: Number(c.price_amount) > 0 ? "Paid" : "Free" },
  };

  let cta: React.ReactNode;
  if (!viewer) cta = <ButtonLink href={p(`/login?next=${encodeURIComponent(p(`/programs/${c.slug}`))}`)} size="lg" className="w-full">{d.programs.signInToEnroll}</ButtonLink>;
  else if (enrollment && ["active", "completed"].includes(enrollment.status)) cta = <ButtonLink href={p(`/learn/${c.slug}`)} size="lg" className="w-full">{d.programs.continue}</ButtonLink>;
  else if (enrollment?.status === "pending_payment" && pendingOrder) cta = <ButtonLink href={p(`/checkout/${pendingOrder}`)} size="lg" variant="accent" className="w-full">{d.programs.pendingPayment}</ButtonLink>;
  else if (enrollment?.status === "pending_approval") cta = <Badge tone="warning" className="w-full justify-center py-2 text-sm">{d.programs.pendingApproval}</Badge>;
  else if (!isStudent) cta = <p className="text-sm text-muted">{d.programs.studentOnly}{viewer.roles.includes("parent") && <> <Link className="font-semibold text-royal-600" href={p("/parent")}>{d.nav.parent}</Link></>}</p>;
  else if (c.availability !== "open") cta = <Badge tone="neutral" className="w-full justify-center py-2 text-sm">{c.availability === "coming_soon" ? d.programs.comingSoon : c.availability === "waitlist" ? d.programs.waitlist : d.programs.notOpen}</Badge>;
  else if (seatsLeft === 0) cta = <Badge tone="neutral" className="w-full justify-center py-2 text-sm">{d.programs.full}</Badge>;
  else cta = (
    <ActionForm action={enrollAction} refreshOnSuccess>
      <input type="hidden" name="course_id" value={c.id} />
      <SubmitButton size="lg" className="w-full" pendingLabel={d.common.loading}>{Number(c.price_amount) > 0 ? d.programs.enroll : d.programs.enrollFree}</SubmitButton>
    </ActionForm>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="bg-neural text-white">
        <Container className="grid gap-8 py-10 lg:grid-cols-[1.3fr_1fr] lg:py-14">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-white/60"><Link href={p("/programs")} className="hover:text-white">{d.nav.programs}</Link> / <span className="text-white/90">{d.enums.category[c.category as keyof typeof d.enums.category]}</span></nav>
            <div className="mt-4 flex flex-wrap gap-2"><Badge tone="cyan">{d.enums.level[c.level as keyof typeof d.enums.level]}</Badge><DemoBadge show={c.is_test_data} label={d.common.demoBadge} /></div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{pick(c, "title", locale)}</h1>
            <p className="mt-3 max-w-2xl text-lg text-white/80">{pick(c, "summary", locale)}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[
                [Users, d.programs.ages, c.age_min ? `${c.age_min}–${c.age_max}` : "—"],
                [Clock, d.programs.duration, c.duration_weeks ? `${c.duration_weeks} ${d.common.weeks}` : "—"],
                [Signal, d.programs.level, d.enums.level[c.level as keyof typeof d.enums.level]],
                [MonitorSmartphone, d.programs.mode, d.enums.mode[c.delivery_mode as keyof typeof d.enums.mode]],
              ].map(([Icon, k, v]) => {
                const I = Icon as typeof Users;
                return <div key={k as string}><dt className="flex items-center gap-1.5 text-white/60"><I className="size-4" aria-hidden />{k as string}</dt><dd className="mt-1 font-semibold">{v as string}</dd></div>;
              })}
            </dl>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl ring-1 ring-white/15">
            {c.cover_url && <Image src={c.cover_url} alt="" fill priority sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />}
          </div>
        </Container>
      </section>

      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-12">
          <section><h2 className="text-xl font-bold text-navy-900">{d.programs.overview}</h2><p className="mt-3 leading-relaxed text-muted">{pick(c, "description", locale)}</p></section>
          {outcomes.length > 0 && (
            <section><h2 className="text-xl font-bold text-navy-900">{d.programs.outcomes}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">{outcomes.map((o) => <li key={o} className="flex gap-2.5 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{o}</li>)}</ul>
            </section>
          )}
          <section>
            <h2 className="text-xl font-bold text-navy-900">{d.programs.curriculum} <span className="text-sm font-medium text-subtle">· {lessonCount} {d.programs.lessons}</span></h2>
            <div className="mt-4 space-y-3">
              {outline.map((m, i) => (
                <details key={m.id} className="group rounded-2xl bg-white ring-1 ring-line" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-navy-900">
                    <span>{i + 1}. {pick(m, "title", locale)}</span><span className="text-xs font-medium text-subtle">{m.lessons.length} {d.programs.lessons}</span>
                  </summary>
                  <ul className="divide-y divide-line border-t border-line">
                    {m.lessons.map((ls) => {
                      const I = lessonIcon[ls.type as keyof typeof lessonIcon] ?? FileText;
                      return (
                        <li key={ls.lesson_id} className="flex items-center gap-3 px-4 py-3 text-sm">
                          <I className="size-4 shrink-0 text-royal-600" aria-hidden />
                          <span className="flex-1">{pick(ls, "title", locale)}</span>
                          {ls.is_preview ? <Badge tone="cyan">{d.programs.previewLesson}</Badge> : <Lock className="size-3.5 text-subtle" aria-label="locked" />}
                          {ls.duration_minutes && <span className="text-xs text-subtle">{ls.duration_minutes} {d.common.minutes}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
              {outline.length === 0 && <p className="text-sm text-muted">—</p>}
            </div>
          </section>
          {reqs.length > 0 && <section><h2 className="text-xl font-bold text-navy-900">{d.programs.requirements}</h2><ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted">{reqs.map((r) => <li key={r}>{r}</li>)}</ul></section>}
          {(c.preview_video_url || media.length > 0) && (
            <section><h2 className="text-xl font-bold text-navy-900">{d.programs.gallery}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {c.preview_video_url && <div className="relative col-span-2 row-span-2 aspect-square overflow-hidden rounded-2xl bg-navy-900"><VideoTile src={c.preview_video_url} label={pick(c, "title", locale)} className="absolute inset-0 size-full object-cover" /></div>}
                {media.map((m) => <div key={m.id} className="relative aspect-square overflow-hidden rounded-2xl"><Image src={m.poster_url ?? m.url} alt={pick(m, "alt", locale)} fill sizes="25vw" className="object-cover" /></div>)}
              </div>
            </section>
          )}
          {c.faqs.length > 0 && (
            <section><h2 className="text-xl font-bold text-navy-900">{d.programs.faqs}</h2>
              <div className="mt-4 space-y-2">{c.faqs.map((f, i) => (
                <details key={i} className="rounded-xl bg-white p-4 ring-1 ring-line"><summary className="cursor-pointer font-semibold text-navy-900">{locale === "ar" ? f.q_ar : f.q_en}</summary><p className="mt-2 text-sm text-muted">{locale === "ar" ? f.a_ar : f.a_en}</p></details>
              ))}</div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <p className="text-sm text-muted">{d.programs.price}</p>
            <p className="mt-1 text-3xl font-extrabold text-navy-900">{priceLabel(c, locale, d)}</p>
            {c.is_test_data && <p className="mt-1 text-xs text-warning">{d.common.demoBadge}</p>}
            {seatsLeft !== null && <p className="mt-3 text-sm text-muted"><span className="font-bold text-navy-900">{seatsLeft}</span> {d.common.seatsLeft} · {d.programs.capacity} {c.capacity}</p>}
            <div className="mt-5">{cta}</div>
            {trainers.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-semibold text-navy-900">{d.programs.instructors}</p>
                <ul className="mt-3 space-y-2">{trainers.map((t) => (
                  <li key={t.trainer_id} className="flex items-center gap-3 text-sm"><span className="grid size-9 place-items-center rounded-full bg-royal-50 font-bold text-royal-700">{t.full_name.replace(/^Demo (Trainer )?/, "").slice(0, 1)}</span>{t.full_name}</li>
                ))}</ul>
              </div>
            )}
          </Card>
        </aside>
      </Container>

      {related.filter((r) => r.id !== c.id).length > 0 && (
        <section className="bg-white py-14">
          <Container>
            <SectionHeading title={d.programs.related} />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.filter((r) => r.id !== c.id).slice(0, 3).map((r) => <CourseCard key={r.id} c={r} locale={locale} d={d} />)}</div>
          </Container>
        </section>
      )}
    </>
  );
}
