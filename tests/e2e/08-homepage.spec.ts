import { expect, test } from "@playwright/test";

test("track cards link to filtered programs and show real counts", async ({ page }) => {
  await page.goto("/en");
  const robotics = page.getByRole("link", { name: /^01\s*Robotics/ });
  await expect(robotics).toHaveAttribute("href", "/en/programs?category=robotics");
  const shown = Number((await robotics.textContent())?.match(/(\d+) programs?/)?.[1]);
  await robotics.click();
  await expect(page).toHaveURL(/category=robotics/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const cards = page.locator('main a[href^="/en/programs/"]'); // not the header menu's program links
  await expect(cards.first()).toBeVisible();
  expect(new Set(await cards.evaluateAll((a) => a.map((x) => x.getAttribute("href")))).size).toBe(shown);
});

test("hero photo background can be paused and navigated by caption", async ({ page }) => {
  await page.goto("/en");
  const region = page.getByRole("region", { name: "Photos from WadiTech" });
  await region.getByRole("button", { name: "Pause slideshow" }).click();
  await expect(region.getByRole("button", { name: "Play slideshow" })).toBeVisible();
  // captions are the buttons' names (WCAG 2.5.3)
  await region.getByRole("button", { name: "Heavy-lift drone build" }).click();
  await expect(region.getByRole("button", { name: "Heavy-lift drone build" })).toHaveAttribute("aria-current", "true");
});

test("lab reel plays muted inline clips", async ({ page }) => {
  await page.goto("/en");
  const reel = page.locator(".wt-marquee");
  await reel.scrollIntoViewIfNeeded();
  const v = reel.locator("video").first();
  await expect(v).toHaveJSProperty("muted", true);
  await expect(v).toHaveAttribute("playsinline", "");
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
