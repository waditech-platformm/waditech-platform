"use client";
import { useState } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

type Msg = { role: "user" | "assistant"; content: string };
export function AssistantPanel({ courseId, lessonId }: { courseId: string; lessonId?: string }) {
  const { dict, locale } = useI18n();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput(""); setBusy(true);
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    try {
      const r = await fetch("/api/ai/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ courseId, lessonId, locale, messages: next.slice(-6) }) });
      const j = await r.json();
      setMode(j.provider ?? null);
      setMsgs([...next, { role: "assistant", content: r.ok ? j.answer : (r.status === 429 ? dict.ai.limit : j.error ?? dict.errors.generic) }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: dict.errors.generic }]);
    } finally { setBusy(false); }
  }
  return (
    <section aria-labelledby="ai-title" className="rounded-2xl bg-white ring-1 ring-line">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3"><Bot className="size-5 text-royal-600" aria-hidden /><h2 id="ai-title" className="font-bold text-navy-900">{dict.ai.title}</h2></div>
      <div className="max-h-80 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
        {msgs.length === 0 && <p className="text-subtle">{dict.ai.disclaimer}</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ms-8 rounded-xl bg-royal-600 px-3 py-2 text-white" : "me-8 whitespace-pre-wrap rounded-xl bg-surface px-3 py-2 text-ink"}>{m.content}</div>
        ))}
        {busy && <p className="flex items-center gap-2 text-subtle"><Loader2 className="size-4 animate-spin" aria-hidden />{dict.ai.thinking}</p>}
        {mode === "local" && <p className="text-[11px] text-subtle">{dict.ai.devMode}</p>}
      </div>
      <form onSubmit={ask} className="flex gap-2 border-t border-line p-3">
        <label htmlFor="ai-q" className="sr-only">{dict.ai.placeholder}</label>
        <input id="ai-q" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder={dict.ai.placeholder}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm focus:border-royal-500 focus:outline-none focus:ring-4 focus:ring-royal-100" />
        <button type="submit" disabled={busy || !input.trim()} className="grid size-10 place-items-center rounded-xl bg-royal-600 text-white disabled:opacity-50" aria-label={dict.ai.send}><Send className="size-4 rtl:-scale-x-100" aria-hidden /></button>
      </form>
    </section>
  );
}
