import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ShieldX, SearchX } from "lucide-react";
import { isLocale, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { Card, Container, DemoBadge, PageHeader } from "@/components/ui/primitives";
import { Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function generateMetadata({ params }: PageProps<"/[locale]/verify">): Promise<Metadata> {
  const { locale } = await params; const d = getDict(isLocale(locale) ? locale : "en"); return { title: d.certificates.verifyTitle, robots: { index: false } };
}
export default async function Verify({ params, searchParams }: PageProps<"/[locale]/verify">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const n = (await searchParams).n;
  const number = typeof n === "string" ? n.trim().toUpperCase().slice(0, 32) : "";
  let result: null | { found: boolean; certificate_number?: string; student_name?: string; course_title_en?: string; course_title_ar?: string; completion_date?: string; status?: string; is_test_data?: boolean } = null;
  let limited = false;
  if (number) {
    if (!(await rateLimit(`verify:${await clientKey()}`, 30, 600))) limited = true;
    else result = (await (await createClient()).rpc("verify_certificate", { p_number: number })).data;
  }
  return (
    <>
      <PageHeader title={d.certificates.verifyTitle} subtitle={d.certificates.verifySubtitle} />
      <Container className="max-w-2xl py-10">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" role="search">
          <div className="flex-1"><Label htmlFor="n">{d.certificates.number}</Label><Input id="n" name="n" defaultValue={number} placeholder="WT-2026-XXXXXXXX" dir="ltr" className="font-latin uppercase tracking-wider" required /></div>
          <Button type="submit" size="lg">{d.certificates.verifyButton}</Button>
        </form>
        {limited && <p className="mt-6 text-sm text-danger">{d.errors.rateLimited}</p>}
        {result && (
          <Card className="mt-8 p-6" aria-live="polite">
            {!result.found ? <p className="flex items-center gap-2 font-semibold text-danger"><SearchX className="size-5" aria-hidden />{d.certificates.notFound}</p> : (
              <div>
                <p className={`flex items-center gap-2 text-lg font-bold ${result.status === "valid" ? "text-success" : "text-danger"}`}>
                  {result.status === "valid" ? <BadgeCheck className="size-6" aria-hidden /> : <ShieldX className="size-6" aria-hidden />}
                  {result.status === "valid" ? d.certificates.valid : d.certificates.revoked}
                </p>
                <DemoBadge show={result.is_test_data} label={d.common.demoBadge} />
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-subtle">{d.certificates.awardedTo}</dt><dd className="font-semibold">{result.student_name}</dd></div>
                  <div><dt className="text-subtle">{d.certificates.issuedFor}</dt><dd className="font-semibold">{locale === "ar" ? result.course_title_ar : result.course_title_en}</dd></div>
                  <div><dt className="text-subtle">{d.certificates.date}</dt><dd className="font-semibold">{result.completion_date && formatDate(result.completion_date, locale)}</dd></div>
                  <div><dt className="text-subtle">{d.certificates.number}</dt><dd className="font-latin font-semibold">{result.certificate_number}</dd></div>
                </dl>
              </div>
            )}
          </Card>
        )}
        <p className="mt-8 text-center text-xs text-subtle"><Link href={`/${locale}`}>{d.meta.fullName}</Link></p>
      </Container>
    </>
  );
}
