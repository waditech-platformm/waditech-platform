import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  // Until an approved production launch, every non-production environment asks crawlers to stay out.
  if (env().APP_ENV !== "production") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/*/dashboard", "/*/admin", "/*/trainer", "/*/parent", "/*/school", "/*/learn", "/*/checkout", "/api/", "/auth/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
