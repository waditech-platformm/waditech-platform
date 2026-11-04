import fs from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

// Development-only server for files written by the "local" storage driver (production uses Supabase Storage).
// `next start` only serves /public files that existed at build time, so uploads made later are streamed here.
const ROOT = path.join(process.cwd(), "public", "uploads");
const TYPES: Record<string, string> = { ".webp": "image/webp", ".mp4": "video/mp4" };

export async function GET(_req: NextRequest, ctx: RouteContext<"/uploads/[...path]">) {
  if (process.env.APP_ENV === "production") return new Response("Not found", { status: 404 });
  const parts = (await ctx.params).path;
  const file = path.resolve(ROOT, ...parts);
  if (!file.startsWith(ROOT + path.sep) || !TYPES[path.extname(file)]) return new Response("Not found", { status: 404 });
  try {
    const body = await fs.readFile(file);
    return new Response(new Uint8Array(body), { headers: { "content-type": TYPES[path.extname(file)], "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
