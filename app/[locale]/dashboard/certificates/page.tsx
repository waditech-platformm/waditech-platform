import Link from "next/link";
import { Award } from "lucide-react";
import { isLocale, pick, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, Card, DemoBadge, EmptyState } from "@/components/ui/primitives";
import { dashboardNav } from "../nav";
export default async function MyCertificates({ params }: PageProps<"/[locale]/dashboard/certificates">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireViewer(locale, "dashboard");
  const { data } = await (await createClient()).from("certificates").select("certificate_number, course_title_en, course_title_ar, completion_date, status, is_test_data").eq("student_id", viewer.id).order("issued_at", { ascending: false });
  return (
    <PortalShell title={d.dashboard.certificates} nav={dashboardNav(locale, d, viewer.roles)}>
      {(data ?? []).length === 0 ? <EmptyState title={d.dashboard.noCertificates} icon={<Award className="size-6" />} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(data ?? []).map((c) => (
          <Card key={c.certificate_number} className="p-5">
            <div className="flex items-center justify-between"><Award className="size-7 text-royal-600" aria-hidden /><Badge tone={c.status === "valid" ? "success" : "danger"}>{c.status === "valid" ? d.certificates.valid : d.certificates.revoked}</Badge></div>
            <p className="mt-3 font-bold text-navy-900">{pick(c, "course_title", locale)}</p>
            <p className="text-xs text-subtle">{formatDate(c.completion_date, locale)} · <span className="font-latin">{c.certificate_number}</span></p>
            <DemoBadge show={c.is_test_data} label={d.common.demoBadge} />
            <Link href={`/${locale}/certificates/${c.certificate_number}`} className="mt-3 inline-block text-sm font-semibold text-royal-600">{d.certificates.view} →</Link>
          </Card>
        ))}</div>
      )}
    </PortalShell>
  );
}
