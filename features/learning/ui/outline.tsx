import Link from "next/link";
import { CheckCircle2, Circle, PlayCircle, FileText, HelpCircle, ClipboardList, FlaskConical } from "lucide-react";
import { pick, type Locale } from "@/lib/i18n/config";
import type { Dict } from "@/messages/en";
import type { LessonFull } from "../queries";
import { cn } from "@/lib/cn";
import { ProgressBar } from "@/components/ui/primitives";

const icons = { video: PlayCircle, text: FileText, resource: FileText, quiz: HelpCircle, assignment: ClipboardList, lab: FlaskConical } as const;

export function CourseOutline({ locale, d, slug, modules, lessons, progress, currentId }: {
  locale: Locale; d: Dict; slug: string; modules: { id: string; title_en: string; title_ar: string }[];
  lessons: LessonFull[]; progress: Map<string, { status: string }>; currentId?: string;
}) {
  const done = lessons.filter((l) => progress.get(l.id)?.status === "completed").length;
  const pct = lessons.length ? Math.round((done * 100) / lessons.length) : 0;
  return (
    <nav aria-label={d.learn.courseContent} className="rounded-2xl bg-white ring-1 ring-line">
      <div className="border-b border-line p-4">
        <p className="font-bold text-navy-900">{d.learn.courseContent}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-subtle"><ProgressBar value={pct} className="flex-1" label={d.dashboard.progress} />{done}/{lessons.length}</div>
      </div>
      <ol className="max-h-[60vh] overflow-y-auto p-2">
        {modules.map((m) => {
          const ls = lessons.filter((l) => l.module_id === m.id);
          const mDone = ls.length > 0 && ls.every((l) => progress.get(l.id)?.status === "completed");
          return (
            <li key={m.id} className="mb-2">
              <p className="flex items-center justify-between px-2 py-2 text-xs font-bold uppercase tracking-wide text-subtle">{pick(m, "title", locale)}{mDone && <span className="text-success normal-case">✓ {d.learn.moduleComplete}</span>}</p>
              <ol>
                {ls.map((l) => {
                  const I = icons[l.type as keyof typeof icons] ?? FileText;
                  const complete = progress.get(l.id)?.status === "completed";
                  return (
                    <li key={l.id}>
                      <Link href={`/${locale}/learn/${slug}/${l.id}`} aria-current={l.id === currentId ? "page" : undefined}
                        className={cn("flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm", l.id === currentId ? "bg-royal-50 font-semibold text-royal-700" : "text-ink hover:bg-surface")}>
                        {complete ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-label={d.learn.completed} /> : <Circle className="size-4 shrink-0 text-line" aria-hidden />}
                        <I className="size-3.5 shrink-0 text-subtle" aria-hidden />
                        <span className="flex-1">{pick(l, "title", locale)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
