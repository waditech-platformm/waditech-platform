import "server-only";
import en from "@/messages/en";
import ar from "@/messages/ar";
import type { Dict } from "@/messages/en";
import type { Locale } from "./config";

const dicts: Record<Locale, Dict> = { en, ar };
export function getDict(locale: Locale): Dict {
  return dicts[locale] ?? en;
}
export type { Dict };
