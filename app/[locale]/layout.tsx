import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { dirOf, isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { I18nProvider } from "@/components/i18n-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { breakingNews } from "@/features/content/queries";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { env } from "@/lib/env";

export const viewport: Viewport = { themeColor: "#0A1A36", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const l: Locale = isLocale(locale) ? locale : "en";
  const d = getDict(l);
  const site = env().NEXT_PUBLIC_SITE_URL;
  return {
    metadataBase: new URL(site),
    title: { default: `${d.meta.fullName}`, template: `%s · ${d.meta.siteName}` },
    description: d.meta.description,
    applicationName: d.meta.siteName,
    alternates: { canonical: `/${l}`, languages: { en: "/en", ar: "/ar", "x-default": "/en" } },
    openGraph: { type: "website", siteName: d.meta.siteName, locale: l === "ar" ? "ar_JO" : "en_JO", images: ["/media/brand/lab-entrance.webp"] },
    icons: { icon: "/media/brand/logo-official-192.png", apple: "/media/brand/logo-official-512.png" },
    // the development / staging build must never be indexed
    robots: env().APP_ENV === "production" ? undefined : { index: false, follow: false },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDict(locale);
  const viewer = await getViewer();
  let unread = 0;
  if (viewer) {
    const s = await createClient();
    const { count } = await s.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null);
    unread = count ?? 0;
  }
  const breaking = await breakingNews();
  const showDemo = env().APP_ENV !== "production";
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold">{dict.common.skipToContent}</a>
        <I18nProvider dict={dict} locale={locale}>
          {showDemo && (
            <div className="no-print bg-warning-bg px-4 py-1.5 text-center text-xs font-semibold text-warning" role="note">{dict.common.demoBanner}</div>
          )}
          {breaking && (
            <AnnouncementBar id={breaking.slug} href={`/${locale}/news/${breaking.slug}`} label={dict.home.breaking} title={locale === "ar" ? breaking.title_ar : breaking.title_en} dismissLabel={dict.home.dismiss} />
          )}
          <div className="no-print"><SiteHeader locale={locale} dict={dict} viewer={viewer} unread={unread} /></div>
          <main id="main">{children}</main>
          <div className="no-print"><SiteFooter locale={locale} dict={dict} /></div>
        </I18nProvider>
      </body>
    </html>
  );
}
