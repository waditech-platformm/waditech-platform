import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { requireViewer } from "./session";
export const requireAdmin = (locale: Locale) => requireViewer(locale, "admin", `/${locale}/admin`);
