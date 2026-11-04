import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { requireViewer } from "@/lib/auth/session";
import { getLearnContext } from "@/features/learning/queries";

/** Resume learning: open the first lesson that is not completed yet. */
export default async function Resume({ params }: PageProps<"/[locale]/learn/[slug]">) {
  const { locale: l, slug } = await params;
  const locale = isLocale(l) ? l : "en";
  const viewer = await requireViewer(locale, "learn", `/${locale}/learn/${slug}`);
  const ctx = await getLearnContext(slug, viewer.id);
  if (!ctx || ctx.lessons.length === 0) notFound();
  const next = ctx.lessons.find((ls) => ctx.progress.get(ls.id)?.status !== "completed") ?? ctx.lessons[0];
  redirect(`/${locale}/learn/${slug}/${next.id}`);
}
