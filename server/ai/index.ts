import "server-only";
import { env } from "@/lib/env";
import { localProvider } from "./local";
import { anthropicProvider, openaiProvider } from "./remote";
import type { AIProvider } from "./types";

export function aiProvider(): AIProvider {
  const e = env();
  if (e.AI_PAID_ENABLED === "true" && e.AI_API_KEY) {
    if (e.AI_PROVIDER === "anthropic") return anthropicProvider;
    if (e.AI_PROVIDER === "openai") return openaiProvider;
  }
  return localProvider;
}
/** Rough USD cost per 1M tokens for monitoring only (update from the provider's price list). */
export const PRICE_PER_MTOK: Record<string, [number, number]> = { local: [0, 0], anthropic: [1, 5], openai: [0.15, 0.6] };
