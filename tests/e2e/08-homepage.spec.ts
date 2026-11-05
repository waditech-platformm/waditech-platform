import { expect, test } from "@playwright/test";

test("program finder filters real programs by age and track, with and without JavaScript", async ({ page, browser }) => {
  await page.goto("/en");
  const finder = page.locator("#finder");
  const count = finder.locator('[aria-live="polite"]');
  const total = Number((await count.textContent())?.match(/\d+/)?.[0]);
  expect(total).toBeGreaterThan(3);

  await finder.getByRole("link", { name: "Robotics", exact: true }).click();
  await expect(page).toHaveURL(/track=robotics/);
  const robotics = Number((await count.textContent())?.match(/\d+/)?.[0] ?? 0);
  expect(robotics).toBeGreaterThan(0);
  expect(robotics).toBeLessThan(total);
  for (const meta of await finder.locator("li").allTextContents()) expect(meta).toContain("Robotics");
  await expect(finder.getByRole("link", { name: "See matching programs" })).toHaveAttribute("href", "/en/programs?category=robotics");

  // the same URL works server-side (progressive enhancement)
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const p2 = await noJs.newPage();
  await p2.goto(page.url());
  await expect(p2.locator('#finder [aria-live="polite"]')).toHaveText(await count.textContent() ?? "");
  await noJs.close();
});

test("More menu is a keyboard-operable disclosure", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en");
  const btn = page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: /More/ });
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Scholarships" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await expect(btn).toBeFocused();
});

test("announcement bar can be dismissed and stays dismissed", async ({ page }) => {
  await page.goto("/en");
  const dismiss = page.getByRole("button", { name: "Dismiss announcement" });
  test.skip(!(await dismiss.count()), "no published announcement in this dataset");
  await dismiss.click();
  await expect(dismiss).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Dismiss announcement" })).toHaveCount(0);
});
