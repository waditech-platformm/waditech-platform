import { expect, test } from "@playwright/test";
import { db, demo, latestMailLink, login } from "./helpers";

const stamp = Date.now();

test("visitor registers, verifies email and lands in the student dashboard", async ({ page }) => {
  const email = `e2e-student-${stamp}@test.local`;
  await page.goto("/en/register");
  await page.locator('input[name="full_name"]').fill("E2E Test Student");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("Strong-Pass-42");
  await page.locator('input[name="confirm"]').fill("Strong-Pass-42");
  await page.locator('input[name="terms"]').check();
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/check-email/);

  // Unverified accounts cannot sign in
  await page.goto("/en/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("Strong-Pass-42");
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/login/);

  const link = await latestMailLink(email, "/auth/confirm");
  await page.goto(link);
  await expect(page).toHaveURL(/\/en\/dashboard/);
  await expect(page.locator("main")).toContainText("E2E Test Student");
});

test("password recovery sends a reset link and the new password works", async ({ page }) => {
  const email = `e2e-reset-${stamp}@test.local`;
  await page.goto("/en/register");
  await page.locator('input[name="full_name"]').fill("E2E Reset User");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("Old-Pass-123");
  await page.locator('input[name="confirm"]').fill("Old-Pass-123");
  await page.locator('input[name="terms"]').check();
  await page.locator('form button[type="submit"]').click();
  await page.goto(await latestMailLink(email, "type=signup"));
  await expect(page).toHaveURL(/dashboard/);
  await page.context().clearCookies();

  await page.goto("/en/forgot-password");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('form button[type="submit"]').click();
  await page.goto(await latestMailLink(email, "type=recovery"));
  await expect(page).toHaveURL(/reset-password/);
  const form = page.locator("form").filter({ has: page.locator('input[name="confirm"]') });
  await form.locator('input[name="password"]').fill("New-Pass-456");
  await form.locator('input[name="confirm"]').fill("New-Pass-456");
  await form.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/reset-password/);
  await page.context().clearCookies();
  await login(page, email, "New-Pass-456");
  await expect(page).toHaveURL(/dashboard/);
});

test("unauthenticated users are sent to login; students are denied admin and trainer areas", async ({ page }) => {
  await page.goto("/en/admin");
  await expect(page).toHaveURL(/\/en\/login/);
  await login(page, demo("student"));
  for (const p of ["/en/admin", "/en/admin/users", "/en/trainer", "/en/school", "/en/parent"]) {
    await page.goto(p);
    await expect(page, p).toHaveURL(/forbidden|login|dashboard/);
    await expect(page.locator("main")).not.toContainText("Demo Admin");
  }
});

test("logout ends the session", async ({ page }) => {
  await login(page, demo("student"));
  await page.goto("/en/dashboard");
  const logout = page.locator('form button[type="submit"]').filter({ hasText: /sign out|log out/i }).first();
  await logout.click();
  await page.goto("/en/dashboard");
  await expect(page).toHaveURL(/login/);
});

test("repeated failed sign-ins are rate limited", async ({ page }) => {
  await db("delete from public.rate_limits where bucket like 'login:%'");
  await page.goto("/en/login");
  for (let i = 0; i < 9; i++) {
    await page.locator('input[name="email"]').fill("nobody@test.local");
    await page.locator('input[name="password"]').fill(`wrong-${i}`);
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(250);
  }
  const rows = await db<{ n: number }>("select max(hits)::int n from public.rate_limits where bucket like 'login:%'");
  expect(rows[0].n).toBeGreaterThanOrEqual(8);
  await expect(page.locator("main, body").first()).toContainText(/too many|try again/i);
});
