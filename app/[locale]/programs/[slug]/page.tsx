import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Users, Signal, MonitorSmartphone, PlayCircle, FileText, HelpCircle, ClipboardList, FlaskConical, Lock, Star, ShieldCheck, GraduationCap } from "lucide-react";
import { isLocale, pick, pickArr, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Badge, Card, Container, DemoBadge, SectionHeading } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CourseCard, CourseStatsLine, priceLabel } from "@/components/cards";
import { VideoTile } from "@/components/video-tile";
import { getCourseBySlug, getCourseOutline, getCourseTrainers, listCourses, seatsTaken } from "@/features/catalog/queries";
import { courseStats, courseTrainerProfiles, publicReviews } from "@/features/community/queries";
import { submitReviewAction } from "@/features/community/actions";
import { TrainerAvatar } from "@/features/community/trainer-avatar";
import { Label, Textarea } from "@/components/ui/form";
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
  const [outline, trainers, taken, viewer, related, media, profiles, reviews, stats] = await Promise.all([
    getCourseOutline(c.id), getCourseTrainers(c.id), seatsTaken(c.id), getViewer(),
    listCourses({ category: c.category }), listMedia({ kind: "image", category: "projects", limit: 4 }),
    courseTrainerProfiles(c.id), publicReviews(c.id, 20), courseStats(),
  ]);
  const st = stats.get(c.id);
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
  // Who may review: the student if they completed it, and a verified parent for each child who completed it.
  let reviewAs: { id: string; label: string }[] = [];
  let myReview: { status: string; rating: number; body: string } | null = null;
  if (viewer) {
    if (enrollment?.status === "completed") reviewAs.push({ id: viewer.id, label: d.community.myself });
    if (viewer.roles.includes("parent")) {
      const { data: links } = await supabase.from("parent_student_links").select("student_id").eq("parent_id", viewer.id).eq("status", "verified");
      const kids = (links ?? []).map((x) => x.student_id as string);
      if (kids.length) {
        const [{ data: done }, { data: names }] = await Promise.all([
          supabase.from("enrollments").select("student_id").eq("course_id", c.id).eq("status", "completed").in("student_id", kids),
          supabase.from("profiles").select("id, full_name").in("id", kids),
        ]);
        for (const e of done ?? []) {
          const n = (names ?? []).find((x) => x.id === e.student_id)?.full_name ?? "";
          reviewAs.push({ id: e.student_id as string, label: d.community.myChild.replace("{name}", n.split(" ").slice(-1)[0] || n) });
        }
      }
    }
    const { data: mine } = await supabase.from("course_reviews").select("status, rating, body").eq("course_id", c.id).eq("author_id", viewer.id).maybeSingle();
    myReview = mine;
    if (myReview) reviewAs = reviewAs.slice(0, 1);
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
      <section className="border-b border-line bg-white">
        <Container className="grid grid-cols-1 items-center gap-10 py-12 [&>*]:min-w-0 lg:grid-cols-[1.3fr_1fr] lg:py-16">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-subtle"><Link href={p("/programs")} className="hover:text-royal-600">{d.nav.programs}</Link> / <span className="text-navy-900">{d.enums.category[c.category as keyof typeof d.enums.category]}</span></nav>
            <div className="mt-4 flex flex-wrap gap-2"><Badge tone="cyan">{d.enums.level[c.level as keyof typeof d.enums.level]}</Badge><DemoBadge show={c.is_test_data} label={d.common.demoBadge} /></div>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-navy-900 sm:text-5xl">{pick(c, "title", locale)}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{pick(c, "summary", locale)}</p>
            <CourseStatsLine s={st} d={d} locale={locale} className="mt-4 text-sm" />
            <dl className="mt-8 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 xl:grid-cols-5">
              {[
                [Users, d.programs.ages, c.age_min ? `${c.age_min}–${c.age_max}` : "—"],
                ...(c.grade_min && c.grade_max ? [[GraduationCap, d.community.grade, `${c.grade_min}–${c.grade_max}`]] : []),
                [Clock, d.programs.duration, c.duration_weeks ? `${c.duration_weeks} ${d.common.weeks}` : "—"],
                [Signal, d.programs.level, d.enums.level[c.level as keyof typeof d.enums.level]],
                [MonitorSmartphone, d.programs.mode, d.enums.mode[c.delivery_mode as keyof typeof d.enums.mode]],
              ].map(([Icon, k, v]) => {
                const I = Icon as typeof Users;
                return <div key={k as string}><dt className="flex items-center gap-1.5 text-subtle"><I className="size-4 text-royal-600" aria-hidden />{k as string}</dt><dd className="mt-1 font-semibold text-navy-900">{v as string}</dd></div>;
              })}
            </dl>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[28px] bg-navy-900 ring-1 ring-line">
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
          <section aria-labelledby="reviews-h">
            <h2 id="reviews-h" className="text-xl font-bold text-navy-900">{d.community.reviewsTitle}</h2>
            <p className="mt-2 flex items-start gap-2 text-sm text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{d.community.verifiedNote}</p>
            {reviews.length === 0 ? <p className="mt-4 text-sm text-muted">{d.community.reviewsEmpty}</p> : (
              <ul className="mt-5 space-y-4">
                {reviews.map((rv) => (
                  <li key={rv.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex" role="img" aria-label={d.community.stars.replace("{n}", String(rv.rating))}>
                        {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-4 ${n <= rv.rating ? "fill-amber-400 text-amber-400" : "text-line"}`} aria-hidden />)}
                      </span>
                      <span className="text-sm font-semibold text-navy-900">{rv.author_first_name}</span>
                      <span className="text-xs text-subtle">{rv.author_role === "parent" ? d.community.parent : d.community.student}</span>
                      <DemoBadge show={rv.is_test_data} label={d.common.demoBadge} />
                    </div>
                    <p className="mt-2 leading-relaxed text-navy-900" lang={rv.locale}>{rv.body}</p>
                  </li>
                ))}
              </ul>
            )}
            {myReview && <p className="mt-5 rounded-xl bg-surface p-4 text-sm text-navy-900 ring-1 ring-line">{myReview.status === "approved" ? d.community.reviewApproved : myReview.status === "rejected" ? d.community.reviewRejected : d.community.reviewPending}</p>}
            {reviewAs.length > 0 && (
              <Card className="mt-6 p-6">
                <h3 className="font-bold text-navy-900">{d.community.writeReview}</h3>
                <ActionForm action={submitReviewAction} refreshOnSuccess className="mt-4 space-y-4">
                  <input type="hidden" name="course_id" value={c.id} />
                  <input type="hidden" name="slug" value={c.slug} />
                  {reviewAs.length === 1 ? <input type="hidden" name="student_id" value={reviewAs[0].id} /> : (
                    <div><Label htmlFor="student_id">{d.community.reviewFor}</Label>
                      <select id="student_id" name="student_id" className="mt-1 h-11 w-full rounded-xl bg-white px-3 ring-1 ring-line">{reviewAs.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
                  )}
                  <fieldset>
                    <legend className="text-sm font-semibold text-navy-900">{d.community.yourRating}</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <label key={n} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-sm ring-1 ring-line has-[:checked]:bg-royal-50 has-[:checked]:ring-royal-500 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-royal-600">
                          <input type="radio" name="rating" value={n} defaultChecked={myReview ? myReview.rating === n : n === 5} className="sr-only" />
                          <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />{d.community.stars.replace("{n}", String(n))}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div><Label htmlFor="body">{d.community.yourReview}</Label>
                    <Textarea id="body" name="body" rows={4} minLength={10} maxLength={1000} required defaultValue={myReview?.body} aria-describedby="body-hint" />
                    <p id="body-hint" className="mt-1 text-xs text-subtle">{d.community.reviewHint}</p></div>
                  <SubmitButton pendingLabel={d.common.saving}>{d.community.submitReview}</SubmitButton>
                </ActionForm>
              </Card>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <p className="text-sm text-muted">{d.programs.price}</p>
            <p className="mt-1 text-3xl font-extrabold text-navy-900">{priceLabel(c, locale, d)}</p>
            {c.is_test_data && <p className="mt-1 text-xs text-warning">{d.common.demoBadge}</p>}
            {seatsLeft !== null && <p className="mt-3 text-sm text-muted"><span className="font-bold text-navy-900">{seatsLeft}</span> {d.common.seatsLeft} · {d.programs.capacity} {c.capacity}</p>}
            <div className="mt-5">{cta}</div>
            {profiles.length > 0 ? (
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-semibold text-navy-900">{d.programs.instructors}</p>
                <ul className="mt-3 space-y-3">{profiles.map((t) => (
                  <li key={t.trainer_id}>
                    <Link href={p(`/trainers/${t.slug}`)} className="group flex items-center gap-3 text-sm">
                      <TrainerAvatar name={pick(t, "display_name", locale)} photo={t.photo_url} size={40} />
                      <span><span className="block font-semibold text-navy-900 group-hover:text-royal-600">{pick(t, "display_name", locale)}</span>{pick(t, "headline", locale) && <span className="block text-xs text-subtle">{pick(t, "headline", locale)}</span>}</span>
                    </Link>
                  </li>
                ))}</ul>
              </div>
            ) : trainers.length > 0 && (
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
