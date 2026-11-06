import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { isLocale, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "Certificate", robots: { index: false } };

export default async function CertificatePage({ params }: PageProps<"/[locale]/certificates/[number]">) {
  const { locale: l, number } = await params;
  const locale: Locale = isLocale(l) ? l : "en";
  const d = getDict(locale);
  const viewer = await getViewer();
  // Full certificate only for its owner, their verified parent, course staff or admins (RLS). Others get the public check.
  if (!viewer) redirect(`/${locale}/verify?n=${encodeURIComponent(number)}`);
  const { data: c } = await (await createClient()).from("certificates").select("*").eq("certificate_number", number.toUpperCase()).maybeSingle();
  if (!c) notFound();
  const verifyUrl = `${env().NEXT_PUBLIC_SITE_URL}/${locale}/verify?n=${c.certificate_number}`;
  const qr = await QRCode.toString(verifyUrl, { type: "svg", margin: 0, color: { dark: "#0A1A36", light: "#00000000" } });
  const revoked = c.status !== "valid";
  return (
    <div className="bg-surface py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4 landscape; margin: 0 } @media print { html, body { width: 297mm; height: 210mm } }`}</style>
      <div className="no-print mx-auto mb-6 flex max-w-[297mm] justify-end px-4"><PrintButton label={d.certificates.print} /></div>
      <div className="mx-auto overflow-x-auto px-4 print:p-0">
        <article className="relative mx-auto flex aspect-[297/210] w-[297mm] min-w-[297mm] flex-col overflow-hidden bg-white shadow-2xl print:shadow-none" aria-label={d.certificates.title}>
          <div className="absolute inset-0 border-[10mm] border-navy-900" />
          <div className="absolute inset-[13mm] border border-cyan-500/60" />
          <div className="bg-neural absolute inset-x-[10mm] top-[10mm] h-[34mm]" />
          <div className="relative flex h-full flex-col items-center px-[28mm] pt-[16mm] text-center">
            <div className="flex w-full items-center justify-between text-white">
              <Image src="/media/brand/logo-original-512.png" alt="WadiTech Academy" width={120} height={120} className="h-[26mm] w-auto rounded-lg" />
              <div className="text-end"><p className="font-latin text-[11px] font-bold tracking-[0.3em] text-cyan-300">LEARN · BUILD · INNOVATE</p><p className="text-sm font-semibold">{d.meta.fullName}</p></div>
            </div>
            <h1 className="mt-[14mm] text-[30px] font-extrabold tracking-tight text-navy-900">{d.certificates.title}</h1>
            {locale === "en" && <p className="text-sm font-semibold text-subtle" dir="rtl">شهادة إتمام</p>}
            <p className="mt-[6mm] text-sm text-muted">{d.certificates.awardedTo}</p>
            <p className="mt-2 border-b-2 border-cyan-500 px-10 pb-2 text-[34px] font-extrabold text-royal-700">{c.student_name}</p>
            <p className="mt-[5mm] text-sm text-muted">{d.certificates.completed}</p>
            <p className="mt-2 text-[22px] font-bold text-navy-900">{locale === "ar" ? c.course_title_ar : c.course_title_en}</p>
            {c.hours_total && <p className="mt-1 text-sm text-muted">{c.hours_total} {d.certificates.hours}</p>}
            {revoked && <p className="mt-3 rounded-full bg-danger-bg px-4 py-1 text-sm font-bold text-danger">{d.certificates.revoked}</p>}
            {c.is_test_data && <p className="mt-2 text-xs font-bold uppercase tracking-wide text-warning">{d.common.demoBadge} — not a real certificate</p>}
            <div className="mt-auto mb-[20mm] grid w-full grid-cols-3 items-end text-xs text-muted">
              <div className="text-start"><p className="font-semibold text-navy-900">{d.certificates.date}</p><p>{formatDate(c.completion_date, locale, { dateStyle: "long" })}</p><p className="mt-2 font-semibold text-navy-900">{d.certificates.number}</p><p className="font-latin">{c.certificate_number}</p></div>
              <div className="flex flex-col items-center"><div className="size-[24mm]" dangerouslySetInnerHTML={{ __html: qr }} /><p className="mt-1">{d.certificates.verifyAt}</p><p className="font-latin text-[10px]" dir="ltr">{env().NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}/verify</p></div>
              <div className="text-end"><div className="ms-auto h-px w-40 bg-navy-900" /><p className="mt-1 font-semibold text-navy-900">{c.signatory_name}</p><p>{c.signatory_title} · {d.certificates.signature}</p></div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
