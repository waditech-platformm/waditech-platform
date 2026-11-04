import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/** CSRF defence for JSON route handlers: require a same-origin Origin header. */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = new Set([new URL(env().NEXT_PUBLIC_SITE_URL).origin, req.nextUrl.origin]);
  if (!origin || !allowed.has(origin)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
