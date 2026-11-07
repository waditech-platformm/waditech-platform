import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PartnerSchool = { id: string; name: string; name_ar: string | null; slug: string; type: string; city: string | null; is_test_data: boolean };
export type NavProgram = { slug: string; title_en: string; title_ar: string; category: string; is_test_data: boolean };
export type NavTrack = { key: string; programs: NavProgram[]; total: number };

/**
 * Partner schools an admin has approved for public listing (migration 0011).
 * Returns [] instead of throwing, so the header still renders if the RPC is missing
 * (e.g. on an environment where 0011 has not been applied yet).
 */
export const partnerSchools = cache(async (): Promise<PartnerSchool[]> => {
  try {
    const s = await createClient();
    const { data, error } = await s.rpc("public_partner_schools");
    if (error) return [];
    return (data ?? []) as PartnerSchool[];
  } catch {
    return [];
  }
});

/** Published programs grouped by track, for the header "Programs" menu. Largest tracks first. */
export const navTracks = cache(async (perTrack = 4): Promise<NavTrack[]> => {
  try {
    const s = await createClient();
    const { data, error } = await s
      .from("courses")
      .select("slug, title_en, title_ar, category, is_test_data")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("title_en")
      .limit(200);
    if (error || !data) return [];
    const by = new Map<string, NavProgram[]>();
    for (const c of data as NavProgram[]) by.set(c.category, [...(by.get(c.category) ?? []), c]);
    return [...by.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([key, list]) => ({ key, programs: list.slice(0, perTrack), total: list.length }));
  } catch {
    return [];
  }
});
