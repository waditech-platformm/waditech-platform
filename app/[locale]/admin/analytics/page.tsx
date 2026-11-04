import { formatMoney, pick } from "@/lib/i18n/config";
import { Alert, Card, Stat, Table, Td, ProgressBar } from "@/components/ui/primitives";
import { BarChart } from "@/components/charts/bar-chart";
import { AdminTitle, adminPage } from "@/features/admin/page-kit";

type Analytics = {
  enrollments_by_week: { week: string; n: number }[];
  signups_by_week: { week: string; n: number }[];
  revenue_by_month: { month: string; jod: number; usd: number }[];
  courses: { id: string; title_en: string; title_ar: string; category: string; enrolled: number; completed: number; certificates: number }[];
  quiz: { attempts: number; passed: number; avg_score: number | null };
  email: { queued: number; sent: number; failed: number };
};

export default async function AdminAnalytics({ params }: PageProps<"/[locale]/admin/analytics">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const { data, error } = await supabase.rpc("admin_analytics");
  if (error || !data) return <Alert tone="danger">{d.errors.generic}</Alert>;
  const s = data as Analytics;
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-JO" : "en-JO");
  const weekLabel = (iso: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { day: "numeric", month: "short", timeZone: "Asia/Amman" }).format(new Date(iso));
  const monthLabel = (iso: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", { month: "short", timeZone: "Asia/Amman" }).format(new Date(iso));
  const passRate = s.quiz.attempts ? Math.round((100 * s.quiz.passed) / s.quiz.attempts) : 0;
  const usdTotal = s.revenue_by_month.reduce((t, m) => t + Number(m.usd), 0);

  return (
    <div className="space-y-6">
      <AdminTitle title={a.analytics} subtitle={a.analyticsNote} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={a.quizPassRate} value={`${nf.format(passRate)}%`} hint={`${nf.format(s.quiz.passed)} / ${nf.format(s.quiz.attempts)}`} />
        <Stat label={a.avgQuizScore} value={s.quiz.avg_score === null ? "—" : `${nf.format(Number(s.quiz.avg_score))}%`} />
        <Stat label={a.emailDelivery} value={nf.format(s.email.sent)} hint={`${a.emailSent} · ${nf.format(s.email.queued)} ${a.emailQueued} · ${nf.format(s.email.failed)} ${a.emailFailed}`} />
        <Stat label={a.usdNote} value={formatMoney(usdTotal, "USD", locale)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-bold text-navy-900">{a.enrollmentsPerWeek}</h2>
          <BarChart title={a.enrollmentsPerWeek} labelEvery={2} format={(n) => nf.format(n)}
            data={s.enrollments_by_week.map((w) => ({ label: weekLabel(w.week), value: Number(w.n) }))} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-bold text-navy-900">{a.signupsPerWeek}</h2>
          <BarChart title={a.signupsPerWeek} labelEvery={2} format={(n) => nf.format(n)}
            data={s.signups_by_week.map((w) => ({ label: weekLabel(w.week), value: Number(w.n) }))} />
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-bold text-navy-900">{a.revenuePerMonth}</h2>
          <BarChart title={a.revenuePerMonth} height={180} width={1200} format={(n) => nf.format(n)}
            data={s.revenue_by_month.map((m) => ({ label: monthLabel(m.month), value: Number(m.jod), tooltip: `${monthLabel(m.month)}: ${formatMoney(Number(m.jod), "JOD", locale)}` }))} />
        </Card>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy-900">{a.coursePerformance}</h2>
        <Table head={[d.nav.programs, a.enrolled, a.completed, a.completionRate, d.admin.certificates]}>
          {s.courses.map((c) => {
            const rate = c.enrolled ? Math.round((100 * c.completed) / c.enrolled) : 0;
            return (
              <tr key={c.id}>
                <Td className="font-semibold">{pick(c, "title", locale)}</Td>
                <Td className="tabular-nums">{nf.format(c.enrolled)}</Td>
                <Td className="tabular-nums">{nf.format(c.completed)}</Td>
                <Td className="w-48"><ProgressBar value={rate} label={a.completionRate} /><span className="text-xs text-subtle tabular-nums">{nf.format(rate)}%</span></Td>
                <Td className="tabular-nums">{nf.format(c.certificates)}</Td>
              </tr>
            );
          })}
        </Table>
      </section>
    </div>
  );
}
