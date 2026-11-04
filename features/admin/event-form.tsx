import type { Dict } from "@/messages/en";
import type { EventRow } from "@/features/content/queries";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { AreaField, CheckField, SelectField, TextField, toLocalInput } from "./fields";
import { saveEventAction } from "./actions";
export function EventForm({ d, e, courses }: { d: Dict; e?: EventRow; courses: { id: string; title_en: string }[] }) {
  const t = d.admin;
  return (
    <ActionForm action={saveEventAction} className="grid gap-4 md:grid-cols-2">
      {e && <input type="hidden" name="id" value={e.id} />}
      <TextField name="title_en" label={t.titleEn} defaultValue={e?.title_en} required dir="ltr" />
      <TextField name="title_ar" label={t.titleAr} defaultValue={e?.title_ar} required dir="rtl" />
      <TextField name="slug" label={t.slug} defaultValue={e?.slug} required dir="ltr" />
      <SelectField name="status" label={d.common.status} defaultValue={e?.status ?? "draft"} options={(["draft", "published", "cancelled", "completed", "archived"] as const).map((s) => [s, d.events.status[s]])} />
      <TextField name="starts_at" label={t.startsAt} type="datetime-local" defaultValue={toLocalInput(e?.starts_at)} required />
      <TextField name="ends_at" label={t.endsAt} type="datetime-local" defaultValue={toLocalInput(e?.ends_at)} />
      <TextField name="location_en" label={t.locationEn} defaultValue={e?.location_en} dir="ltr" />
      <TextField name="location_ar" label={t.locationAr} defaultValue={e?.location_ar} dir="rtl" />
      <AreaField name="description_en" label={t.descriptionEn} defaultValue={e?.description_en} rows={6} dir="ltr" />
      <AreaField name="description_ar" label={t.descriptionAr} defaultValue={e?.description_ar} rows={6} dir="rtl" />
      <TextField name="capacity" label={t.capacity} type="number" defaultValue={e?.capacity} />
      <TextField name="cover_url" label={t.coverUrl} defaultValue={e?.cover_url} dir="ltr" />
      <SelectField name="course_id" label={d.nav.programs} defaultValue={e?.course_id} options={[["", "—"], ...courses.map((c) => [c.id, c.title_en] as [string, string])]} />
      <CheckField name="registration_open" label={d.events.register} defaultChecked={e?.registration_open ?? true} className="self-end" />
      <div className="md:col-span-2"><SubmitButton>{d.common.save}</SubmitButton></div>
    </ActionForm>
  );
}
