import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/primitives";
import { ActionForm } from "@/components/ui/action-form";
import { ArticleForm } from "@/features/admin/article-form";
import { deleteArticleAction } from "@/features/admin/actions";
import type { Article } from "@/features/content/queries";
export default async function EditArticle({ params }: PageProps<"/[locale]/admin/news/[id]">) {
  const { locale: l, id } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const isNew = id === "new";
  const a = isNew ? undefined : ((await (await createClient()).from("news_articles").select("*").eq("id", id).maybeSingle()).data as Article | null) ?? notFound();
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div><Link href={`/${locale}/admin/news`} className="text-sm font-semibold text-royal-600">← {d.admin.news}</Link><h1 className="mt-1 text-2xl font-extrabold text-navy-900">{isNew ? d.admin.newArticle : a?.title_en}</h1></div>
        {a && <div className="flex items-center gap-4">{a.status === "published" && <Link href={`/${locale}/news/${a.slug}`} className="text-sm font-semibold text-royal-600">{d.common.preview} ↗</Link>}
          <ActionForm action={deleteArticleAction} confirmText={`${d.common.delete}?`}><input type="hidden" name="id" value={a.id} /><button className="text-sm font-semibold text-danger">{d.common.delete}</button></ActionForm></div>}
      </div>
      <Card className="p-6"><ArticleForm d={d} a={a ?? undefined} /></Card>
    </div>
  );
}
