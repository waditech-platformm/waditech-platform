import Link from "next/link";
import { isLocale, pick, formatMoney, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Badge, DemoBadge, Table, Td } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
export default async function AdminCourses({ params }: PageProps<"/[locale]/admin/courses">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const { data } = await (await createClient()).from("courses").select("id, slug, title_en, title_ar, category, status, price_amount, currency, availability, is_test_data, updated_at").order("updated_at", { ascending: false });
  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><h1 className="text-2xl font-extrabold text-navy-900">{d.admin.courses}</h1><ButtonLink href={`/${locale}/admin/courses/new`}>{d.admin.newCourse}</ButtonLink></div>
      <Table head={[d.admin.titleEn, d.programs.category, d.programs.price, d.programs.availability, d.common.status]}>
        {(data ?? []).map((c) => (
          <tr key={c.id}>
            <Td><Link href={`/${locale}/admin/courses/${c.id}`} className="font-semibold text-royal-700 hover:underline">{pick(c, "title", locale)}</Link><p className="font-latin text-xs text-subtle">/{c.slug}</p><DemoBadge show={c.is_test_data} label={d.common.demoBadge} /></Td>
            <Td>{d.enums.category[c.category as keyof typeof d.enums.category]}</Td>
            <Td>{Number(c.price_amount) ? formatMoney(Number(c.price_amount), c.currency, locale) : d.common.free}</Td>
            <Td>{d.enums.availability[c.availability as keyof typeof d.enums.availability]}</Td>
            <Td><Badge tone={c.status === "published" ? "success" : c.status === "draft" ? "warning" : "neutral"}>{c.status}</Badge></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
