import Link from "next/link";
import Image from "next/image";
import { isLocale, pick, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, Card, EmptyState, Stat } from "@/components/ui/primitives";
import { trainerNav } from "./nav";

export default async function TrainerHome({ params }: PageProps<"/[locale]/trainer">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireViewer(locale, "trainer", `/${locale}/trainer`);
  const supabase = await createClient();
  const q = supabase.from("courses").select("id, slug, title_en, title_ar, thumbnail_url, status, is_test_data, course_instructors!inner(trainer_id)");
  const { data: courses } = isAdminRole(viewer.roles) && !viewer.roles.includes("trainer") ? await supabase.from("courses").select("id, slug, title_en, title_ar, thumbnail_url, status, is_test_data") : await q.eq("course_instructors.trainer_id", viewer.id);
  const ids = (courses ?? []).map((c) => c.id);
  const [{ data: enr }, { count: pendingSubs }, { count: reviews }] = await Promise.all([
    ids.length ? supabase.from("enrollments").select("course_id").in("course_id", ids).in("status", ["active", "completed"]) : Promise.resolve({ data: [] as { course_id: string }[] }),
    ids.length ? supabase.from("submissions").select("id", { count: "exact", head: true }).in("course_id", ids).eq("status", "submitted") : Promise.resolve({ count: 0 }),
    ids.length ? supabase.from("assessment_attempts").select("id", { count: "exact", head: true }).in("course_id", ids).eq("status", "needs_review") : Promise.resolve({ count: 0 }),
  ]);
  const counts = new Map<string, number>();
  for (const e of enr ?? []) counts.set(e.course_id, (counts.get(e.course_id) ?? 0) + 1);
  return (
    <PortalShell title={d.trainer.title} subtitle={viewer.profile.full_name} nav={trainerNav(locale, d)}>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label={d.trainer.myCourses} value={ids.length} />
        <Stat label={d.trainer.submissions} value={pendingSubs ?? 0} />
        <Stat label={d.trainer.quizReviews} value={reviews ?? 0} />
      </div>
      {(courses ?? []).length === 0 ? <EmptyState title={d.common.emptyTitle} /> : (
        <div className="wt-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(courses ?? []).map((c) => (
          <Link key={c.id} href={`/${locale}/trainer/courses/${c.id}`}>
            <Card className="overflow-hidden transition hover:shadow-[var(--shadow-lift)]">
              <div className="relative aspect-[16/8] bg-deep-900">{c.thumbnail_url && <Image src={c.thumbnail_url} alt="" fill sizes="33vw" className="object-cover" />}</div>
              <div className="p-4"><p className="font-bold text-navy-900">{pick(c, "title", locale)}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted">{counts.get(c.id) ?? 0} {d.trainer.students}<Badge tone={c.status === "published" ? "success" : "neutral"}>{c.status}</Badge></p></div>
            </Card>
          </Link>
        ))}</div>
      )}
    </PortalShell>
  );
}
