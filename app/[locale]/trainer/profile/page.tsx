import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/layout/portal-shell";
import { Badge, Card } from "@/components/ui/primitives";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { AreaField, TextField } from "@/features/admin/fields";
import { toneFor } from "@/features/admin/page-kit";
import { saveTrainerProfileAction } from "@/features/community/actions";
import { trainerNav } from "../nav";

const CATS = ["robotics", "ai", "programming", "cybersecurity", "electronics", "embedded", "iot", "drones", "3d_printing", "stem"] as const;
type Profile = { slug: string; display_name_en: string; display_name_ar: string; headline_en: string | null; headline_ar: string | null; bio_en: string | null; bio_ar: string | null; specialties: string[]; photo_url: string | null; years_experience: number | null; status: string };

export default async function TrainerProfile({ params }: PageProps<"/[locale]/trainer/profile">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  const viewer = await requireViewer(locale, "trainer", `/${locale}/trainer/profile`);
  const supabase = await createClient();
  const { data } = await supabase.from("trainer_profiles").select("slug, display_name_en, display_name_ar, headline_en, headline_ar, bio_en, bio_ar, specialties, photo_url, years_experience, status").eq("trainer_id", viewer.id).maybeSingle();
  const p = data as Profile | null;
  const t = d.trainer;
  const statuses = t.profileStatuses as Record<string, string>;
  const cats = d.enums.category as Record<string, string>;
  const fallbackSlug = viewer.profile.full_name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "trainer";
  return (
    <PortalShell title={t.myProfile} subtitle={t.profileIntro} nav={trainerNav(locale, d)}>
      <Card className="p-6">
        {p && (
          <p className="mb-5 flex flex-wrap items-center gap-2 text-sm">{t.profileStatus}: <Badge tone={toneFor(p.status === "pending" ? "pending" : p.status)}>{statuses[p.status] ?? p.status}</Badge>
            {p.status === "published" && <Link className="font-semibold text-royal-600" href={`/${locale}/trainers/${p.slug}`}>{d.community.viewProfile}</Link>}</p>
        )}
        <ActionForm action={saveTrainerProfileAction} refreshOnSuccess className="grid gap-4 md:grid-cols-2">
          <TextField name="display_name_en" label={t.displayNameEn} defaultValue={p?.display_name_en ?? viewer.profile.full_name} required dir="ltr" />
          <TextField name="display_name_ar" label={t.displayNameAr} defaultValue={p?.display_name_ar} required dir="rtl" />
          <TextField name="headline_en" label={t.headlineEn} defaultValue={p?.headline_en} dir="ltr" />
          <TextField name="headline_ar" label={t.headlineAr} defaultValue={p?.headline_ar} dir="rtl" />
          <AreaField name="bio_en" label={t.bioEn} defaultValue={p?.bio_en} dir="ltr" />
          <AreaField name="bio_ar" label={t.bioAr} defaultValue={p?.bio_ar} dir="rtl" />
          <TextField name="slug" label={d.admin.slug} defaultValue={p?.slug ?? fallbackSlug} required dir="ltr" />
          <TextField name="years_experience" label={d.community.yearsExperience} type="number" min={0} max={60} defaultValue={p?.years_experience} />
          <TextField name="photo_url" label={t.photoUrl} defaultValue={p?.photo_url} dir="ltr" className="md:col-span-2" placeholder="https://…" />
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-semibold text-navy-900">{d.community.specialties}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATS.map((c) => (
                <label key={c} className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-line has-[:checked]:bg-royal-50 has-[:checked]:ring-royal-500">
                  <input type="checkbox" name="specialties" value={c} defaultChecked={p?.specialties.includes(c)} className="size-4 accent-royal-600" />{cats[c]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <SubmitButton name="intent" value="review" pendingLabel={d.common.saving}>{t.submitForReview}</SubmitButton>
            <SubmitButton name="intent" value="draft" variant="secondary" pendingLabel={d.common.saving}>{t.saveDraft}</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </PortalShell>
  );
}
