import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { createConfirmedUser, db, demo, login, MAIL } from "./helpers";

const cronSecret = () => fs.readFileSync(".env.local", "utf8").match(/^CRON_SECRET=(.+)$/m)?.[1] ?? "";

test("pages send a nonce-based Content-Security-Policy and render without CSP violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text()); });
  page.on("pageerror", (e) => violations.push(e.message));
  const res = await page.goto("/en");
  const csp = res?.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'self'");
  for (const p of ["/ar", "/en/programs", "/en/programs/robotics-foundations", "/en/gallery", "/en/contact"]) await page.goto(p);
  await login(page, demo("student"));
  await page.goto("/en/dashboard");
  await page.goto("/en/learn/robotics-foundations");
  expect(violations).toEqual([]);
});

test("each request gets a fresh nonce", async ({ request }) => {
  const a = (await request.get("/en")).headers()["content-security-policy"].match(/nonce-([^']+)/)?.[1];
  const b = (await request.get("/en")).headers()["content-security-policy"].match(/nonce-([^']+)/)?.[1];
  expect(a).toBeTruthy();
  expect(a).not.toBe(b);
});

test("email worker rejects callers without the cron secret", async ({ request }) => {
  expect((await request.post("/api/cron/notifications")).status()).toBe(401);
  expect((await request.post("/api/cron/notifications", { headers: { authorization: "Bearer wrong-secret-value-123" } })).status()).toBe(401);
});

test("enrolling sends a bilingual confirmation email through the queue", async ({ page, request }) => {
  const email = `e2e-mail-${Date.now()}@test.local`;
  const { id } = await createConfirmedUser(email, "Mail-Pass-123", "E2E Mail Student");
  await db("update profiles set preferred_locale='ar' where id=$1", [id]);
  await login(page, email, "Mail-Pass-123");
  await page.goto("/en/programs/robotics-foundations");
  await page.getByRole("button", { name: "Enroll for free" }).click();
  await expect.poll(async () => (await db("select count(*)::int n from notifications where user_id=$1 and email_status='queued'", [id]))[0].n).toBeGreaterThan(0);

  // the worker sends 25 per run (oldest first); run it until this user's email has gone out
  for (let i = 0; i < 40; i++) {
    const r = await request.post("/api/cron/notifications", { headers: { authorization: `Bearer ${cronSecret()}` } });
    expect(r.status()).toBe(200);
    const left = (await db("select count(*)::int n from notifications where user_id=$1 and email_status='queued'", [id]))[0].n;
    if (left === 0) break;
  }
  await expect.poll(async () => (await db("select count(*)::int n from notifications where user_id=$1 and email_status='sent'", [id]))[0].n).toBeGreaterThan(0);

  const mails = (await (await fetch(`${MAIL}?to=${encodeURIComponent(email)}`)).json()) as { subject: string; html: string }[];
  const m = mails.find((x) => /تأكيد|التسجيل|Enroll/i.test(x.subject));
  expect(m, "confirmation email captured").toBeTruthy();
  expect(m!.html).toContain('href="http://localhost:3000/ar/');
});

test("admin analytics shows charts and course performance", async ({ page }) => {
  await login(page, demo("admin"));
  for (const l of ["en", "ar"]) {
    const res = await page.goto(`/${l}/admin/analytics`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('main svg[role="img"]')).toHaveCount(3);
    await expect(page.locator("main table").last()).toContainText(l === "en" ? "Robotics Foundations" : "أساسيات الروبوتات");
  }
  await page.context().clearCookies();
  await login(page, demo("trainer"));
  await page.goto("/en/admin/analytics");
  await expect(page.locator('main svg[role="img"]')).toHaveCount(0);
});
