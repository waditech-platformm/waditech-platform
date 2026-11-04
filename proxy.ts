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

  // 2) refresh the Supabase session cookie
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getClaims();

  // 3) coarse gate for portal areas (fine-grained role checks happen server-side in each page + RLS)
  const rest = pathname.slice(seg.length + 1) || "/";
  if (!data?.claims && PROTECTED.some((p) => rest === p || rest.startsWith(p + "/"))) {
    const url = req.nextUrl.clone();
    url.pathname = `/${seg}/login`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  // Remember the language only for real navigations — a background prefetch of the language
  // switcher link must not silently flip the visitor's language.
  const isPrefetch =
    req.headers.has("next-router-prefetch") || req.headers.get("purpose") === "prefetch" || /prefetch/i.test(req.headers.get("sec-purpose") ?? "");
  if (!isPrefetch && req.cookies.get("wt_locale")?.value !== seg) {
    res.cookies.set("wt_locale", seg, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/|auth/|media/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|webp|svg|mp4|ico|txt|xml)$).*)"],
};
