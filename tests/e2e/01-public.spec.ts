import { expect, test } from "@playwright/test";

test("visitor opens the homepage with the official imagery and hero", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Empowering the Next Generation of Innovators");
  for (const src of ["lab-entrance", "logo-original", "lab-classroom"]) {
    await expect(page.locator(`img[src*="${src}"]`).first()).toBeAttached();
  }
  await expect(page.locator('a[href="/en/programs"]').first()).toBeVisible();
});

test("visitor browses and filters programs, then opens a program page", async ({ page }) => {
  await page.goto("/en/programs");
  const cards = page.locator('a[href^="/en/programs/"]');
  const all = await cards.count();
  expect(all).toBeGreaterThan(3);
  await page.goto("/en/programs?category=robotics");
  const filtered = await page.locator('a[href^="/en/programs/"]').count();
  expect(filtered).toBeLessThan(all);
  await page.goto("/en/programs/python-for-young-coders");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Python");
  await expect(page.getByText(/JOD\s*85/).first()).toBeVisible();
});

test("English/Arabic switching sets direction and language", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.locator('a[href^="/ar"]').first().click();
  await expect(page).toHaveURL(/\/ar/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

test("certificate verification works and shows minimal data", async ({ page }) => {
  await page.goto("/en/verify?n=WT-2026-DEMO0001");
  await expect(page.getByText("WT-2026-DEMO0001").first()).toBeVisible();
  await page.goto("/en/verify?n=WT-0000-NOPE0000");
  await expect(page.locator("main")).not.toContainText("@");
});

test("no horizontal overflow on key pages at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const p of ["/en", "/ar", "/en/programs", "/ar/programs", "/en/news", "/en/events", "/en/labs"]) {
    await page.goto(p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, p).toBeLessThanOrEqual(0);
  }
});
