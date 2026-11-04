import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Demo-Pass-2026!";
export const demo = (who: string) => `${who}@demo.waditech.local`;
export const MAIL = process.env.E2E_MAIL_URL ?? "http://127.0.0.1:54321/__mail";

export async function login(page: Page, email: string, password = DEMO_PASSWORD, locale = "en") {
  // The suite signs in more often than the production login limit (10 / 5 min / IP) allows;
  // reset only the LOCAL login counters so the limiter itself stays enabled and is exercised elsewhere.
  await db("delete from public.rate_limits where bucket like 'login:%'");
  await page.goto(`/${locale}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

export async function latestMailLink(to: string, contains: string) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAIL}?to=${encodeURIComponent(to)}`);
    const mails = (await res.json()) as { html?: string; text?: string }[];
    const body = mails.map((m) => m.html ?? m.text ?? "").join("\n");
    const links = [...body.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&")).filter((l) => l.includes(contains));
    if (links.length) return links[links.length - 1];
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no email with link containing ${contains} for ${to}`);
}

import fs from "node:fs";
import pg from "pg";

function localEnv(key: string) {
  const line = fs.readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim() ?? "";
}

/** Creates a confirmed student via the Auth admin API of the LOCAL stack (never used against hosted projects). */
export async function createConfirmedUser(email: string, password: string, full_name: string, account_type = "student") {
  const base = localEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (/supabase\.co/.test(base)) throw new Error("refusing to create test users on a hosted project");
  const key = localEnv("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${base}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name, account_type, locale: "en" } }),
  });
  if (!res.ok) throw new Error(`create user failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string };
}

/** Read-only checks against the local database (verifies the UI really wrote data). */
export async function db<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54322/waditech" });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}
