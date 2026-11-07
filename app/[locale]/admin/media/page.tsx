import Image from "next/image";
import { pick } from "@/lib/i18n/config";
import { Alert, Badge, Card } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Select } from "@/components/ui/form";
import { CheckField, SelectField, TextField } from "@/features/admin/fields";
import { AdminTitle, adminPage, toneFor } from "@/features/admin/page-kit";
import * as A from "@/features/admin/actions";

const CATS = ["general", "competition", "classroom", "projects", "events", "labs", "brand"] as const;
type Media = { id: string; kind: string; url: string; poster_url: string | null; title_en: string | null; title_ar: string | null; alt_en: string | null; category: string; shows_students: boolean; consent_status: string; is_public: boolean; featured: boolean; bytes: number | null };

export default async function AdminMedia({ params, searchParams }: PageProps<"/[locale]/admin/media">) {
  const { locale, d, supabase } = await adminPage(params);
  const a = d.admin;
  const sp = await searchParams;
  const cat = typeof sp.category === "string" && (CATS as readonly string[]).includes(sp.category) ? sp.category : null;
  let q = supabase.from("media_assets").select("id, kind, url, poster_url, title_en, title_ar, alt_en, category, shows_students, consent_status, is_public, featured, bytes").order("created_at", { ascending: false }).limit(120);
  if (cat) q = q.eq("category", cat);
  const { data } = await q;
  const items = (data ?? []) as Media[];
  return (
    <div className="space-y-6">
      <AdminTitle title={a.media} subtitle={a.uploadHelp} />
      <Alert tone="warning">{a.consentWarning}</Alert>
      <Card className="p-5">
        <h2 className="mb-4 font-bold">{a.upload}</h2>
        <ActionForm action={A.uploadMediaAction} resetOnSuccess className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="file" className="mb-1.5 block text-sm font-semibold">{a.file}</label>
            <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" required className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-royal-50 file:px-3 file:py-2 file:font-semibold file:text-royal-700" />
          </div>
          <TextField name="title_en" label={a.titleEn} dir="ltr" />
          <TextField name="title_ar" label={a.titleAr} dir="rtl" />
          <TextField name="alt_en" label={a.altEn} dir="ltr" />
          <TextField name="alt_ar" label={a.altAr} dir="rtl" />
          <SelectField name="category" label={a.category} options={CATS.map((c) => [c, d.gallery.categories[c]])} />
          <CheckField name="shows_students" label={a.showsStudents} defaultChecked className="self-end" />
          <div className="md:col-span-2"><SubmitButton pendingLabel={d.common.saving}>{a.upload}</SubmitButton></div>
        </ActionForm>
      </Card>
      <form className="flex gap-2">
        <Select name="category" defaultValue={cat ?? ""} className="w-56" aria-label={a.category}><option value="">{d.common.all}</option>{CATS.map((c) => <option key={c} value={c}>{d.gallery.categories[c]}</option>)}</Select>
        <SubmitButton variant="secondary">{d.common.filter}</SubmitButton>
      </form>
      <ul className="wt-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((m) => (
          <li key={m.id}>
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-surface">
                {m.kind === "image" ? <Image src={m.url} alt={m.alt_en ?? ""} fill sizes="(min-width:1280px) 30vw, 90vw" className="object-cover" />
                  : m.poster_url ? <Image src={m.poster_url} alt="" fill sizes="30vw" className="object-cover" /> : <div className="grid h-full place-items-center text-sm text-muted">MP4</div>}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex-1 truncate text-sm font-semibold">{pick(m as unknown as Record<string, unknown>, "title", locale) || m.url.split("/").pop()}</p>
                  <Badge tone={m.is_public ? "success" : "neutral"}>{m.is_public ? a.makePublic : d.common.draft}</Badge>
                  {m.shows_students && <Badge tone={toneFor(m.consent_status)}>{a.consent}: {m.consent_status}</Badge>}
                </div>
                <ActionForm action={A.updateMediaAction} className="grid gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <Select name="consent_status" defaultValue={m.consent_status} aria-label={a.consent} className="h-9">{["not_required", "pending", "granted", "denied"].map((s) => <option key={s} value={s}>{a.consent}: {s}</option>)}</Select>
                  <div className="flex flex-wrap gap-4">
                    <CheckField name="is_public" label={a.makePublic} defaultChecked={m.is_public} />
                    <CheckField name="featured" label={a.featured} defaultChecked={m.featured} />
                    <CheckField name="shows_students" label={a.showsStudents} defaultChecked={m.shows_students} />
                  </div>
                  <SubmitButton size="sm" variant="secondary">{d.common.save}</SubmitButton>
                </ActionForm>
                <ActionForm action={A.deleteMediaAction} confirmText={`${d.common.delete}?`}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="text-xs font-semibold text-danger">{d.common.delete}</button>
                </ActionForm>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
