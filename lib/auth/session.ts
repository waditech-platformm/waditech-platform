import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";
import { canAccess, type Area, type Role } from "./roles";

export type Profile = {
  id: string;
  full_name: string;
  preferred_locale: "en" | "ar";
  account_status: "active" | "suspended" | "deactivated";
  family_link_code: string;
  phone: string | null;
  is_test_data: boolean;
};
export type Viewer = { id: string; email: string; profile: Profile; roles: Role[] };

/** Verified viewer for this request (getUser() validates the JWT with the auth server). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, preferred_locale, account_status, family_link_code, phone, is_test_data").eq("id", data.user.id).single(),
    supabase.from("user_roles").select("role").eq("user_id", data.user.id),
  ]);
  if (!profile) return null;
  return { id: data.user.id, email: data.user.email ?? "", profile: profile as Profile, roles: (roles ?? []).map((r) => r.role as Role) };
});

export async function requireViewer(locale: Locale, area?: Area, next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/${locale}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (viewer.profile.account_status !== "active") redirect(`/${locale}/login?error=suspended`);
  if (area && !canAccess(viewer.roles, area)) redirect(`/${locale}/forbidden`);
  return viewer;
}
