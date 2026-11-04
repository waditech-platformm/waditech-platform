import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Article = { id: string; slug: string; title_en: string; title_ar: string; excerpt_en: string | null; excerpt_ar: string | null; body_en: string | null; body_ar: string | null; cover_url: string | null; category: string; status: string; published_at: string | null; featured: boolean; is_breaking: boolean; seo_title: string | null; seo_description: string | null; is_test_data: boolean };
export type EventRow = { id: string; slug: string; title_en: string; title_ar: string; description_en: string | null; description_ar: string | null; starts_at: string; ends_at: string | null; location_en: string | null; location_ar: string | null; capacity: number | null; registration_open: boolean; status: string; cover_url: string | null; course_id: string | null; is_test_data: boolean };
export type Lab = { id: string; slug: string; category: string; title_en: string; title_ar: string; summary_en: string | null; summary_ar: string | null; instructions_en: string | null; instructions_ar: string | null; provider: string; launch_url: string | null; embed_allowed: boolean; level: string; status: string; position: number };
export type Media = { id: string; kind: "image" | "video" | "document"; url: string; poster_url: string | null; title_en: string | null; title_ar: string | null; alt_en: string | null; alt_ar: string | null; category: string; width: number | null; height: number | null; featured: boolean };
export type Competition = { id: string; slug: string; title_en: string; title_ar: string; description_en: string | null; description_ar: string | null; category: string | null; eligibility_en: string | null; eligibility_ar: string | null; team_min: number; team_max: number; age_min: number | null; age_max: number | null; registration_deadline: string | null; event_date: string | null; status: string; cover_url: string | null; is_test_data: boolean };
export type Scholarship = { id: string; slug: string; title_en: string; title_ar: string; description_en: string | null; description_ar: string | null; criteria_en: string | null; criteria_ar: string | null; coverage_percent: number | null; course_id: string | null; deadline: string | null; status: string; is_test_data: boolean };

const ARTICLE = "id, slug, title_en, title_ar, excerpt_en, excerpt_ar, body_en, body_ar, cover_url, category, status, published_at, featured, is_breaking, seo_title, seo_description, is_test_data";
const EVENT = "id, slug, title_en, title_ar, description_en, description_ar, starts_at, ends_at, location_en, location_ar, capacity, registration_open, status, cover_url, course_id, is_test_data";

export async function listNews(opts: { limit?: number; category?: string; q?: string } = {}) {
  const s = await createClient();
  let q = s.from("news_articles").select(ARTICLE).eq("status", "published").lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(opts.limit ?? 30);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.q) { const t = opts.q.replace(/[%,()]/g, " ").slice(0, 60); q = q.or(`title_en.ilike.%${t}%,title_ar.ilike.%${t}%`); }
  return ((await q).data ?? []) as Article[];
}
export async function getArticle(slug: string) {
  const s = await createClient();
  return ((await s.from("news_articles").select(ARTICLE).eq("slug", slug).maybeSingle()).data ?? null) as Article | null;
}
export async function breakingNews() {
  const s = await createClient();
  return ((await s.from("news_articles").select("slug, title_en, title_ar").eq("status", "published").eq("is_breaking", true).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(1).maybeSingle()).data ?? null) as Pick<Article, "slug" | "title_en" | "title_ar"> | null;
}
export async function listEvents(when: "upcoming" | "past" | "all" = "upcoming", limit = 30) {
  const s = await createClient();
  let q = s.from("events").select(EVENT).in("status", ["published", "completed", "cancelled"]);
  const now = new Date().toISOString();
  if (when === "upcoming") q = q.gte("starts_at", now).order("starts_at");
  else if (when === "past") q = q.lt("starts_at", now).order("starts_at", { ascending: false });
  else q = q.order("starts_at", { ascending: false });
  return ((await q.limit(limit)).data ?? []) as EventRow[];
}
export async function getEvent(slug: string) {
  const s = await createClient();
  return ((await s.from("events").select(EVENT).eq("slug", slug).maybeSingle()).data ?? null) as EventRow | null;
}
export async function eventSeats(id: string) {
  const s = await createClient();
  const { data } = await s.rpc("event_seats", { p_event: id });
  const row = (data as { registered: number; capacity: number | null }[] | null)?.[0];
  return row ?? { registered: 0, capacity: null };
}
export async function listLabs() {
  const s = await createClient();
  return ((await s.from("labs").select("*").eq("status", "published").order("position")).data ?? []) as Lab[];
}
export async function getLab(slug: string) {
  const s = await createClient();
  return ((await s.from("labs").select("*").eq("slug", slug).maybeSingle()).data ?? null) as Lab | null;
}
export async function listMedia(opts: { kind?: "image" | "video"; category?: string; featured?: boolean; limit?: number } = {}) {
  const s = await createClient();
  let q = s.from("media_assets").select("id, kind, url, poster_url, title_en, title_ar, alt_en, alt_ar, category, width, height, featured").eq("is_public", true).order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(opts.limit ?? 60);
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.featured) q = q.eq("featured", true);
  return ((await q).data ?? []) as Media[];
}
export async function listCompetitions(limit = 20) {
  const s = await createClient();
  return ((await s.from("competitions").select("*").neq("status", "draft").order("registration_deadline", { ascending: true, nullsFirst: false }).limit(limit)).data ?? []) as Competition[];
}
export async function getCompetition(slug: string) {
  const s = await createClient();
  return ((await s.from("competitions").select("*").eq("slug", slug).maybeSingle()).data ?? null) as Competition | null;
}
export async function listScholarships(limit = 20) {
  const s = await createClient();
  return ((await s.from("scholarships").select("*").neq("status", "draft").order("deadline", { ascending: true, nullsFirst: false }).limit(limit)).data ?? []) as Scholarship[];
}
export async function getScholarship(slug: string) {
  const s = await createClient();
  return ((await s.from("scholarships").select("*").eq("slug", slug).maybeSingle()).data ?? null) as Scholarship | null;
}
export type PublicProject = { id: string; title: string; description: string | null; cover_url: string | null; link_url: string | null; student_first_name: string; course_title_en: string | null; course_title_ar: string | null; is_test_data: boolean };
export async function publicProjects(limit = 24) {
  const s = await createClient();
  return ((await s.rpc("public_projects", { p_limit: limit })).data ?? []) as PublicProject[];
}
