// usage: node scripts/dev/shot.mjs <url> <out.png> [width] [fullPage=1] [loginEmail]
import { chromium } from "playwright";
const [url, out, width = "1440", full = "1", email] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
if (email) {
  await page.goto("http://localhost:3000/en/login");
  await page.fill("#email", email); await page.fill("#password", "Demo-Pass-2026!");
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 20000 }), page.click("button[type=submit]")]);
}
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(600);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
await page.screenshot({ path: out, fullPage: full === "1" });
console.log(JSON.stringify({ url: page.url(), overflow, errors: errors.slice(0, 5) }));
await browser.close();
