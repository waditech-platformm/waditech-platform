import "server-only";
import { Marked } from "marked";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const md = new Marked({ gfm: true, breaks: false });
md.use({
  renderer: {
    // never pass through raw HTML from authored content (stored-XSS protection)
    html({ text }) { return escapeHtml(text); },
    link({ href, title, tokens }) {
      const safe = /^(https?:|mailto:|\/)/i.test(href) ? href : "#";
      const label = this.parser.parseInline(tokens);
      const ext = /^https?:/i.test(safe);
      return `<a href="${escapeHtml(safe)}"${title ? ` title="${escapeHtml(title)}"` : ""}${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
    },
    image({ href, text }) {
      const safe = /^(https:|\/)/i.test(href) ? href : "";
      return safe ? `<img src="${escapeHtml(safe)}" alt="${escapeHtml(text)}" loading="lazy" />` : "";
    },
  },
});
export function renderMarkdown(src: string | null | undefined) {
  return md.parse(src ?? "", { async: false }) as string;
}
