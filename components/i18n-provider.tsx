"use client";
import { createContext, useContext } from "react";
import type { Dict } from "@/messages/en";
import type { Locale } from "@/lib/i18n/config";

const Ctx = createContext<{ dict: Dict; locale: Locale } | null>(null);
export function I18nProvider({ dict, locale, children }: { dict: Dict; locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={{ dict, locale }}>{children}</Ctx.Provider>;
}
export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}
