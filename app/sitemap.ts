import type { MetadataRoute } from "next";
import { createClient as createAnon } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { locales } from "@/lib/i18n/config";

// Public, published content only. Uses the anonymous key, so RLS guarantees nothing private is listed.
// Rendered per request (not at build time) so builds never depend on database access.
export const dynamic = "force-dynamic";

const STATIC = ["", "programs", "labs", "news", "events", "competitions", "scholarships", "schools", "projects", "gallery", "about", "contact", "verify", "trainers", "library"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const e = env();
  const base = e.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const db = createAnon(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const [courses, news, events, labs, trainers] = await Promise.all([
    db.from("courses").select("slug, updated_at").eq("status", "published"),
    db.from("news_articles").select("slug, updated_at").eq("status", "published"),
    db.from("events").select("slug, updated_at").eq("status", "published"),
    db.from("labs").select("slug").eq("status", "published"),
    db.rpc("public_trainers"),
  ]);
  const entry = (path: string, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${base}/en${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
  });
  return [
    ...STATIC.map((p) => entry(p ? `/${p}` : "")),
    ...(courses.data ?? []).map((r) => entry(`/programs/${r.slug}`, r.updated_at)),
    ...(news.data ?? []).map((r) => entry(`/news/${r.slug}`, r.updated_at)),
    ...(events.data ?? []).map((r) => entry(`/events/${r.slug}`, r.updated_at)),
    ...(labs.data ?? []).map((r) => entry(`/labs/${r.slug}`)),
    ...((trainers.data ?? []) as { slug: string }[]).map((r) => entry(`/trainers/${r.slug}`)),
  ];
}
