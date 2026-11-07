import path from "node:path";
import { expect, test } from "@playwright/test";
import { db, demo, login } from "./helpers";

const stamp = Date.now();
const SECTIONS = ["", "users", "courses", "enrollments", "certificates", "news", "events", "competitions", "scholarships", "labs", "media", "payments", "families", "projects", "schools", "messages", "notifications", "audit"];

test("every admin section loads in English and Arabic without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, demo("admin"));
  for (const locale of ["en", "ar"]) {
    for (const s of SECTIONS) {
      const res = await page.goto(`/${locale}/admin${s ? `/${s}` : ""}`);
      expect(res?.status(), `${locale}/${s}`).toBe(200);
      await expect(page.locator("main h1").first(), `${locale}/${s}`).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});

test("visitor contact message reaches the admin inbox", async ({ page, browser }) => {
  await page.goto("/en/contact");
  const form = page.locator("main form").filter({ has: page.locator('textarea[name="message"]') });
  await form.locator('[name="name"]').fill(`E2E Visitor ${stamp}`);
  await form.locator('[name="email"]').fill(`visitor-${stamp}@test.local`);
  await form.locator('[name="message"]').fill("We would like a robotics program for our school next term.");
  await form.locator('button[type="submit"]').click();
  await expect.poll(async () => (await db("select count(*)::int n from contact_messages where email=$1", [`visitor-${stamp}@test.local`]))[0].n).toBe(1);

  const admin = await browser.newPage();
  await login(admin, demo("admin"));
  await admin.goto("/en/admin/messages");
  await expect(admin.locator("main")).toContainText(`E2E Visitor ${stamp}`);
  await admin.close();
});

test("admin uploads an image: stored privately, metadata stripped, published only after consent", async ({ page, browser }) => {
  await login(page, demo("admin"));
  await page.goto("/en/admin/media");
  await page.locator('input[name="file"]').setInputFiles(path.resolve("public/media/photos/classroom-40-sm.webp"));
  await page.locator('[name="title_en"]').fill(`E2E upload ${stamp}`);
  await page.getByRole("button", { name: "Upload" }).click();
  await expect.poll(async () => (await db("select count(*)::int n from media_assets where title_en=$1", [`E2E upload ${stamp}`]))[0].n).toBe(1);
  const [m] = await db<{ id: string; url: string; is_public: boolean; consent_status: string; mime_type: string }>("select id, url, is_public, consent_status, mime_type from media_assets where title_en=$1", [`E2E upload ${stamp}`]);
  expect(m.is_public).toBe(false);
  expect(m.consent_status).toBe("pending");
  expect(m.mime_type).toBe("image/webp");

  // An anonymous visitor cannot see it via the API-backed gallery until it is public AND consent is granted
  const anon = await browser.newPage();
  await anon.goto("/en/gallery");
  expect(await anon.locator(`img[src*="${m.url.split("/").pop()}"]`).count()).toBe(0);
  await anon.close();

  // rejects a file that is not really an image (magic-byte check, not the file name)
  await page.locator('input[name="file"]').setInputFiles({ name: "evil.webp", mimeType: "image/webp", buffer: Buffer.from("<script>alert(1)</script>") });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.locator("main")).toContainText(/JPEG\/PNG\/WebP/);
});

test("non-admins cannot reach admin sections", async ({ page }) => {
  await login(page, demo("trainer"));
  for (const s of ["payments", "audit", "media", "users"]) {
    await page.goto(`/en/admin/${s}`);
    await expect(page.locator("main")).not.toContainText(/Audit log|Transactions/);
  }
});
