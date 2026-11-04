import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDict } from "@/lib/i18n/dictionary";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/primitives";
import { CourseForm } from "@/features/admin/course-form";
export default async function NewCourse({ params }: PageProps<"/[locale]/admin/courses/new">) {
  const { locale: l } = await params; const locale: Locale = isLocale(l) ? l : "en"; const d = getDict(locale);
  await requireAdmin(locale);
  const { data: programs } = await (await createClient()).from("programs").select("id, title_en").order("position");
  return <div><h1 className="mb-5 text-2xl font-extrabold text-navy-900">{d.admin.newCourse}</h1><Card className="p-6"><CourseForm d={d} programs={programs ?? []} /></Card></div>;
}
