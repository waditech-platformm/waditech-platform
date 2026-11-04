import type { AIProvider } from "./types";

/**
 * Offline, zero-cost development provider. It does NOT use an LLM: it retrieves the most relevant
 * sentences from the lesson and wraps them in a guided, Socratic reply. Good enough to exercise the
 * full pipeline (auth, quotas, logging, UI) without a paid API.
 */
const STOP = new Set("the a an is are of to in and or for on with what how why do does i me my you it this that be can ما هو هي في من على عن كيف لماذا هل أن ان".split(" "));
const tokens = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}_ ]+/gu, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));

export const localProvider: AIProvider = {
  name: "local",
  async complete({ context, messages, locale }) {
    const q = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    const qt = new Set(tokens(q));
    const sentences = context.replace(/```[\s\S]*?```/g, (m) => m.replace(/\n/g, " ⏎ ")).split(/(?<=[.!?؟])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 12);
    const ranked = sentences.map((s) => ({ s, score: tokens(s).filter((w) => qt.has(w)).length })).sort((a, b) => b.score - a.score);
    const best = ranked.filter((r) => r.score > 0).slice(0, 2).map((r) => r.s.replace(/ ⏎ /g, "\n"));
    const isCode = /```|def |print\(|if .*:|loop\(|void |#include|function /i.test(q);
    const ar = locale === "ar";
    const parts: string[] = [];
    if (best.length) parts.push(ar ? `من الدرس:\n• ${best.join("\n• ")}` : `From the lesson:\n• ${best.join("\n• ")}`);
    else parts.push(ar ? "لم أجد هذا مباشرة في الدرس، لكن لنفكر فيه خطوة بخطوة." : "I couldn't find that directly in this lesson, so let's reason it through step by step.");
    if (isCode) parts.push(ar ? "لفهم الكود: اقرأه سطرًا سطرًا، واكتب ما تتوقع أن يفعله كل سطر، ثم شغّله وقارن النتيجة بتوقعك." : "To understand code: read it line by line, write what you expect each line to do, then run it and compare the result with your prediction.");
    parts.push(ar ? "سؤال لك: ما الخطوة الأولى التي ستجربها، ولماذا؟" : "Question for you: what is the first step you would try, and why?");
    const text = parts.join("\n\n");
    return { text, inputTokens: Math.ceil((context.length + q.length) / 4), outputTokens: Math.ceil(text.length / 4), model: "local-retrieval-v1" };
  },
};
