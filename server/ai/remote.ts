import "server-only";
import { env } from "@/lib/env";
import type { AIProvider } from "./types";

/** Paid providers. Only reachable when AI_PAID_ENABLED=true (requires organisational approval). Keys stay server-side. */
export const anthropicProvider: AIProvider = {
  name: "anthropic",
  async complete({ system, context, messages }) {
    const e = env();
    const model = e.AI_MODEL ?? "claude-haiku-5-5";
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": e.AI_API_KEY ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 600, system: `${system}\n\n<lesson>\n${context}\n</lesson>`, messages }),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}`);
    const j = (await r.json()) as { content: { type: string; text?: string }[]; usage: { input_tokens: number; output_tokens: number } };
    return { text: j.content.filter((c) => c.type === "text").map((c) => c.text).join("\n"), inputTokens: j.usage.input_tokens, outputTokens: j.usage.output_tokens, model };
  },
};
export const openaiProvider: AIProvider = {
  name: "openai",
  async complete({ system, context, messages }) {
    const e = env();
    const model = e.AI_MODEL ?? "gpt-4o-mini";
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${e.AI_API_KEY ?? ""}`, "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: "system", content: `${system}\n\n<lesson>\n${context}\n</lesson>` }, ...messages] }),
    });
    if (!r.ok) throw new Error(`openai ${r.status}`);
    const j = (await r.json()) as { choices: { message: { content: string } }[]; usage: { prompt_tokens: number; completion_tokens: number } };
    return { text: j.choices[0]?.message.content ?? "", inputTokens: j.usage.prompt_tokens, outputTokens: j.usage.completion_tokens, model };
  },
};
