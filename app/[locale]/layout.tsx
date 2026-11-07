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
import { navTracks, partnerSchools } from "@/features/navigation/queries";
import { CircuitField } from "@/components/circuit-field";
import { env } from "@/lib/env";
import { cookies } from "next/headers";

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#071224" }],
  width: "device-width",
  initialScale: 1,
};
// No saved theme -> no data-theme attribute, and globals.css follows the OS (prefers-color-scheme).

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
    icons: { icon: "/media/brand/logo-icon-192.png", apple: "/media/brand/logo-icon-512.png" },
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
  const [breaking, tracks, schools] = await Promise.all([breakingNews(), navTracks(), partnerSchools()]);
  const showDemo = env().APP_ENV !== "production";
  const saved = (await cookies()).get("wt_theme")?.value;
  const theme = saved === "dark" || saved === "light" ? saved : undefined;
  return (
    // suppressHydrationWarning: the theme toggle changes data-theme on the client
    <html lang={locale} dir={dirOf(locale)} data-theme={theme} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2 focus:font-semibold">{dict.common.skipToContent}</a>
        {/* site-wide animated circuit layer: fixed behind every page, shows through the translucent sections */}
        <div aria-hidden className="no-print pointer-events-none fixed inset-0 -z-10"><CircuitField global density={0.55} cell={34} /></div>
        <I18nProvider dict={dict} locale={locale}>
          {showDemo && (
            <div className="no-print bg-warning-bg px-4 py-1.5 text-center text-xs font-semibold text-warning" role="note">{dict.common.demoBanner}</div>
          )}
          {breaking && (
            <AnnouncementBar id={breaking.slug} href={`/${locale}/news/${breaking.slug}`} label={dict.home.breaking} title={locale === "ar" ? breaking.title_ar : breaking.title_en} dismissLabel={dict.home.dismiss} />
          )}
          <div className="no-print"><SiteHeader locale={locale} dict={dict} viewer={viewer} unread={unread} tracks={tracks} schools={schools} /></div>
          <main id="main">{children}</main>
          <div className="no-print"><SiteFooter locale={locale} dict={dict} /></div>
        </I18nProvider>
      </body>
    </html>
  );
}
