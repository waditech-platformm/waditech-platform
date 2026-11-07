import Link from "next/link";
import { isLocale, pick, formatDate, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Badge, DemoBadge, Table, Td } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
export default async function AdminNews({ params }: PageProps<"/[locale]/admin/news">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const { data } = await (await createClient()).from("news_articles").select("id, slug, title_en, title_ar, status, published_at, category, is_test_data").order("updated_at", { ascending: false });
  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><h1 className="text-2xl font-extrabold text-navy-900">{d.admin.news}</h1><ButtonLink href={`/${locale}/admin/news/new`}>{d.admin.newArticle}</ButtonLink></div>
      <Table head={[d.admin.titleEn, d.admin.category, d.common.status, d.common.date]}>{(data ?? []).map((a) => (
        <tr key={a.id}><Td><Link href={`/${locale}/admin/news/${a.id}`} className="font-semibold text-royal-700 hover:underline">{pick(a, "title", locale)}</Link> <DemoBadge show={a.is_test_data} label={d.common.demoBadge} /></Td><Td>{a.category}</Td>
          <Td><Badge tone={a.status === "published" ? (a.published_at && new Date(a.published_at) > new Date() ? "blue" : "success") : "warning"}>{a.status === "published" && a.published_at && new Date(a.published_at) > new Date() ? "scheduled" : a.status}</Badge></Td><Td className="text-subtle">{a.published_at ? formatDate(a.published_at, locale) : "-"}</Td></tr>
      ))}</Table>
    </div>
  );
}
