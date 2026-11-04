import { renderMarkdown } from "@/lib/markdown";
export function Markdown({ source, className }: { source: string | null | undefined; className?: string }) {
  // content is sanitised in renderMarkdown (raw HTML escaped, unsafe URLs dropped)
  return <div className={`prose-wt ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }} />;
}
