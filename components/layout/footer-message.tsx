"use client";
import { usePathname } from "next/navigation";

/**
 * Hides the footer contact form on pages that already have their own form:
 * sign-in, registration, password pages and /contact. Two email fields on one page
 * confuse people and password managers (and made test selectors ambiguous).
 */
const OWN_FORM = /^\/(en|ar)\/(login|register|forgot-password|reset-password|check-email|contact)\/?$/;

export function FooterMessage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (OWN_FORM.test(pathname)) return null;
  return <>{children}</>;
}
