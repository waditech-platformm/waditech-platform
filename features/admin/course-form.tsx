import type { Dict } from "@/messages/en";
import type { Course } from "@/features/catalog/queries";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { AreaField, CheckField, SelectField, TextField } from "./fields";
import { saveCourseAction } from "./actions";

const CATS = ["robotics", "ai", "programming", "cybersecurity", "electronics", "embedded", "iot", "drones", "3d_printing", "stem"] as const;
export function CourseForm({ d, c, programs }: { d: Dict; c?: Partial<Course> & { id?: string }; programs: { id: string; title_en: string }[] }) {
  const a = d.admin;
  return (
    <ActionForm action={saveCourseAction} className="grid gap-4 md:grid-cols-2">
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      <TextField name="title_en" label={a.titleEn} defaultValue={c?.title_en} required dir="ltr" />
      <TextField name="title_ar" label={a.titleAr} defaultValue={c?.title_ar} required dir="rtl" />
      <TextField name="slug" label={a.slug} defaultValue={c?.slug} required dir="ltr" placeholder="robotics-foundations" />
      <SelectField name="program_id" label={a.programs} defaultValue={c?.program_id ?? ""} options={[["", "—"], ...programs.map((p) => [p.id, p.title_en] as [string, string])]} />
      <AreaField name="summary_en" label={a.summaryEn} defaultValue={c?.summary_en} rows={2} dir="ltr" />
      <AreaField name="summary_ar" label={a.summaryAr} defaultValue={c?.summary_ar} rows={2} dir="rtl" />
      <AreaField name="description_en" label={a.descriptionEn} defaultValue={c?.description_en} dir="ltr" />
      <AreaField name="description_ar" label={a.descriptionAr} defaultValue={c?.description_ar} dir="rtl" />
      <div className="grid grid-cols-2 gap-4 md:col-span-2 lg:grid-cols-4">
        <SelectField name="category" label={d.programs.category} defaultValue={c?.category ?? "robotics"} options={CATS.map((k) => [k, d.enums.category[k]])} />
        <SelectField name="level" label={d.programs.level} defaultValue={c?.level ?? "beginner"} options={(["beginner", "intermediate", "advanced"] as const).map((k) => [k, d.enums.level[k]])} />
        <SelectField name="delivery_mode" label={d.programs.mode} defaultValue={c?.delivery_mode ?? "in_person"} options={(["in_person", "online", "hybrid"] as const).map((k) => [k, d.enums.mode[k]])} />
        <SelectField name="availability" label={d.programs.availability} defaultValue={c?.availability ?? "open"} options={(["open", "waitlist", "closed", "coming_soon"] as const).map((k) => [k, d.enums.availability[k]])} />
        <TextField name="age_min" label={a.ageMin} type="number" defaultValue={c?.age_min} />
        <TextField name="age_max" label={a.ageMax} type="number" defaultValue={c?.age_max} />
        <TextField name="duration_weeks" label={a.durationWeeks} type="number" defaultValue={c?.duration_weeks} />
        <TextField name="hours_total" label={a.hoursTotal} type="number" defaultValue={c?.hours_total} />
        <TextField name="price_amount" label={a.price} type="number" step="0.001" defaultValue={c?.price_amount ?? 0} />
        <SelectField name="currency" label={a.currency} defaultValue={c?.currency ?? "JOD"} options={[["JOD", "JOD"], ["USD", "USD"]]} />
        <TextField name="capacity" label={a.capacity} type="number" defaultValue={c?.capacity} />
      </div>
      <TextField name="thumbnail_url" label={`${a.coverUrl} (thumbnail)`} defaultValue={c?.thumbnail_url} dir="ltr" />
      <TextField name="cover_url" label={a.coverUrl} defaultValue={c?.cover_url} dir="ltr" />
      <TextField name="preview_video_url" label={a.videoUrl} defaultValue={c?.preview_video_url} dir="ltr" />
      <div />
      <AreaField name="outcomes_en" label={a.outcomesEn} defaultValue={c?.outcomes_en?.join("\n")} dir="ltr" rows={4} />
      <AreaField name="outcomes_ar" label={a.outcomesAr} defaultValue={c?.outcomes_ar?.join("\n")} dir="rtl" rows={4} />
      <AreaField name="requirements_en" label={a.requirementsEn} defaultValue={c?.requirements_en?.join("\n")} dir="ltr" rows={3} />
      <AreaField name="requirements_ar" label={a.requirementsAr} defaultValue={c?.requirements_ar?.join("\n")} dir="rtl" rows={3} />
      <div className="flex flex-wrap gap-6 md:col-span-2"><CheckField name="featured" label={a.featured} defaultChecked={c?.featured} /><CheckField name="requires_approval" label={a.requiresApproval} defaultChecked={c?.requires_approval} /></div>
      <div className="md:col-span-2"><SubmitButton pendingLabel={d.common.saving}>{d.common.save}</SubmitButton></div>
    </ActionForm>
  );
}
