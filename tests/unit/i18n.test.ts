import { describe, expect, it } from "vitest";
import en from "@/messages/en";
import ar from "@/messages/ar";
import { dirOf, isLocale, pick } from "@/lib/i18n/config";

function keys(o: unknown, prefix = ""): string[] {
  if (o === null || typeof o !== "object" || Array.isArray(o)) return [prefix];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("bilingual dictionaries", () => {
  it("Arabic covers every English key and vice versa", () => {
    const e = new Set(keys(en));
    const a = new Set(keys(ar));
    expect([...e].filter((k) => !a.has(k))).toEqual([]);
    expect([...a].filter((k) => !e.has(k))).toEqual([]);
  });
  it("has no empty Arabic strings", () => {
    const empty = keys(ar).filter((k) => k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], ar) === "");
    expect(empty).toEqual([]);
  });
});

describe("locale helpers", () => {
  it("maps direction", () => {
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
  });
  it("validates locales", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
  it("picks localized DB fields with English fallback", () => {
    expect(pick({ title_en: "Robots", title_ar: "روبوتات" }, "title", "ar")).toBe("روبوتات");
    expect(pick({ title_en: "Robots" }, "title", "ar")).toBe("Robots");
  });
});
