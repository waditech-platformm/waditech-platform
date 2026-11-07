import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOCALES = ["en", "ar"];
const PROTECTED = ["/dashboard", "/learn", "/trainer", "/parent", "/school", "/admin", "/checkout"];

function pickLocale(req: NextRequest) {
  const fromCookie = req.cookies.get("wt_locale")?.value;
  if (fromCookie && LOCALES.includes(fromCookie)) return fromCookie;
  const accept = req.headers.get("accept-language") ?? "";
  return /^\s*ar\b/i.test(accept) ? "ar" : "en";
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const seg = pathname.split("/")[1];

  // 1) locale prefix
  if (!LOCALES.includes(seg)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${pickLocale(req)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // 2) per-request Content-Security-Policy with a nonce (Next.js applies it to its own scripts)
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });

  // 3) refresh the Supabase session cookie
  let res = next();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        requestHeaders.set("cookie", req.headers.get("cookie") ?? "");
        res = next();
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();

  // 4) coarse gate for portal areas (fine-grained role checks happen server-side in each page + RLS)
  const rest = pathname.slice(seg.length + 1) || "/";
  if (!data?.claims && PROTECTED.some((p) => rest === p || rest.startsWith(p + "/"))) {
    const url = req.nextUrl.clone();
    url.pathname = `/${seg}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  // Remember the language only for real navigations: a background prefetch of the language
  // switcher link must not silently flip the visitor's language.
  const isPrefetch =
    req.headers.has("next-router-prefetch") || req.headers.get("purpose") === "prefetch" || /prefetch/i.test(req.headers.get("sec-purpose") ?? "");
  if (!isPrefetch && req.cookies.get("wt_locale")?.value !== seg) {
    res.cookies.set("wt_locale", seg, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

/** Strict CSP: scripts only from this origin with the request nonce (+ scripts they load, e.g. the HyperPay widget). */
function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  let supabase = "";
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    supabase = `${u.origin} ${u.protocol === "https:" ? "wss" : "ws"}://${u.host}`;
  } catch {}
  const hyperpay = "https://eu-test.oppwa.com https://eu-prod.oppwa.com";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase.split(" ")[0] ?? ""} ${hyperpay}`.trim(),
    `media-src 'self' blob: ${supabase.split(" ")[0] ?? ""}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${supabase} ${hyperpay}`.trim(),
    // Google Maps embed in the footer (loaded only after the visitor clicks "Show map")
    `frame-src ${hyperpay} https://www.google.com`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${hyperpay}`,
    "frame-ancestors 'self'",
  ];
  if (process.env.APP_ENV === "production" || process.env.APP_ENV === "staging") directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export const config = {
  matcher: ["/((?!_next/|api/|auth/|media/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|webp|svg|mp4|ico|txt|xml)$).*)"],
};
