import type { Dict } from "@/messages/en";
import type { Article } from "@/features/content/queries";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { AreaField, CheckField, SelectField, TextField, toLocalInput } from "./fields";
import { saveArticleAction } from "./actions";
export function ArticleForm({ d, a }: { d: Dict; a?: Article }) {
  const t = d.admin;
  return (
    <ActionForm action={saveArticleAction} className="grid gap-4 md:grid-cols-2">
      {a && <input type="hidden" name="id" value={a.id} />}
      <TextField name="title_en" label={t.titleEn} defaultValue={a?.title_en} required dir="ltr" />
      <TextField name="title_ar" label={t.titleAr} defaultValue={a?.title_ar} required dir="rtl" />
      <TextField name="slug" label={t.slug} defaultValue={a?.slug} required dir="ltr" />
      <SelectField name="category" label={t.category} defaultValue={a?.category ?? "news"} options={[["news", "news"], ["announcement", "announcement"], ["article", "article"], ["achievement", "achievement"]]} />
      <AreaField name="excerpt_en" label={t.excerptEn} defaultValue={a?.excerpt_en} rows={2} dir="ltr" />
      <AreaField name="excerpt_ar" label={t.excerptAr} defaultValue={a?.excerpt_ar} rows={2} dir="rtl" />
      <AreaField name="body_en" label={t.bodyEn} defaultValue={a?.body_en} rows={12} dir="ltr" />
      <AreaField name="body_ar" label={t.bodyAr} defaultValue={a?.body_ar} rows={12} dir="rtl" />
      <TextField name="cover_url" label={t.coverUrl} defaultValue={a?.cover_url} dir="ltr" placeholder="/media/photos/… or https://…" />
      <TextField name="published_at" label={t.publishAt} type="datetime-local" defaultValue={toLocalInput(a?.published_at)} />
      <TextField name="seo_title" label={t.seoTitle} defaultValue={a?.seo_title} />
      <TextField name="seo_description" label={t.seoDescription} defaultValue={a?.seo_description} />
      <div className="flex flex-wrap gap-6 md:col-span-2"><CheckField name="featured" label={t.featured} defaultChecked={a?.featured} /><CheckField name="is_breaking" label={t.breaking} defaultChecked={a?.is_breaking} /></div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <SubmitButton name="intent" value="draft" variant="secondary">{t.saveDraft}</SubmitButton>
        <SubmitButton name="intent" value="publish">{t.publish}</SubmitButton>
        {a && <SubmitButton name="intent" value="archive" variant="ghost">{t.archive}</SubmitButton>}
      </div>
    </ActionForm>
  );
}
