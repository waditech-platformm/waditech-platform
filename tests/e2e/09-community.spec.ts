import { expect, test } from "@playwright/test";
import { createConfirmedUser, db, demo, login } from "./helpers";

test("trainers page lists only published profiles, each with their real programs", async ({ page }) => {
  await page.goto("/en/trainers");
  await expect(page.getByRole("link", { name: /Lina \(demo\)/ })).toBeVisible();
  await expect(page.getByText("Kareem (demo)")).toHaveCount(0); // still waiting for review
  await page.getByRole("link", { name: /Lina \(demo\)/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lina (demo)");
  const taught = await db<{ n: number }>("select count(*)::int n from course_instructors ci join courses c on c.id = ci.course_id and c.status = 'published' where ci.trainer_id = '00000000-0000-4000-a000-000000000003'");
  await expect(page.locator('main a[href^="/en/programs/"]')).toHaveCount(taught[0].n); // not the header menu
  // and the program page links back to the profile
  await page.goto("/en/programs/robotics-foundations");
  await expect(page.getByRole("link", { name: /Lina \(demo\)/ })).toHaveAttribute("href", "/en/trainers/demo-lina");
});

test("library shows locked resources without their links, and unlocks after sign-in", async ({ page }) => {
  await page.goto("/en/library");
  await expect(page.getByRole("link", { name: /^Open\W+\[Demo\] Arduino pin-out/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to open" })).toBeVisible();
  await expect(page.getByText("For enrolled students")).toBeVisible();
  await expect(page.getByText("[Demo] Draft resource")).toHaveCount(0);
  await expect(page.locator('a[href="https://www.python.org/shell/"]')).toHaveCount(0);

  await login(page, demo("student")); // Omar: active in Robotics Foundations
  await page.goto("/en/library");
  await expect(page.locator('a[href="https://www.python.org/shell/"]')).toBeVisible();
  await expect(page.getByRole("link", { name: /^Open\W+\[Demo\] Robotics Foundations worksheet/ })).toBeVisible();

  await page.goto("/en/library?category=electronics");
  await expect(page.getByRole("listitem").filter({ hasText: "[Demo]" })).toHaveCount(1);
});

test("programs can be filtered by school grade", async ({ page }) => {
  const [{ n }] = await db<{ n: number }>("select count(*)::int n from courses where status = 'published' and grade_min <= 4 and grade_max >= 4");
  await page.goto("/en/programs?grade=4");
  await expect(page.locator("p[aria-live]")).toContainText(String(n));
  await expect(page.getByLabel("Grade")).toHaveValue("4");
});

test("a student who completed a course can review it; it is public only after an admin approves", async ({ page, browser }) => {
  const stamp = Date.now();
  const email = `reviewer-${stamp}@example.test`;
  const u = await createConfirmedUser(email, "Review-Pass-123", `Rana Reviewer${stamp}`);
  await db("insert into enrollments(course_id, student_id, status, completed_at) values ('0c000000-0000-4000-a000-000000000002', $1, 'completed', now())", [u.id]);
  const text = `Loved building the quiz game ${stamp}`;

  await login(page, email, "Review-Pass-123");
  await page.goto("/en/programs/python-for-young-coders");
  await page.getByText("4 stars").click();
  await page.getByLabel("Your review").fill(text);
  await page.getByRole("button", { name: "Submit review" }).click();
  await expect(page.getByText("Your review is waiting to be checked.")).toBeVisible();
  expect((await db("select rating, status from course_reviews where author_id = $1", [u.id]))[0]).toEqual({ rating: 4, status: "pending" });

  const anon = await browser.newContext();
  const pub = await anon.newPage();
  await pub.goto("/en/programs/python-for-young-coders");
  await expect(pub.getByText(text)).toHaveCount(0);

  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, demo("admin"));
  await admin.goto("/en/admin/reviews");
  await admin.getByRole("listitem").filter({ hasText: text }).getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByRole("listitem").filter({ hasText: text }).getByText("approved")).toBeVisible();

  await pub.reload();
  await expect(pub.getByText(text)).toBeVisible();
  await expect(pub.getByRole("listitem").filter({ hasText: text })).toContainText("Rana");
  await expect(pub.getByRole("listitem").filter({ hasText: text })).not.toContainText(`Reviewer${stamp}`);
  await anon.close(); await adminCtx.close();
});

test("a student who has not completed the course sees no review form", async ({ page }) => {
  await login(page, demo("student")); // Omar is active (not completed) in Robotics Foundations
  await page.goto("/en/programs/robotics-foundations");
  await expect(page.getByRole("heading", { name: "Reviews from students and parents" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit review" })).toHaveCount(0);
});

test("a trainer's profile edit goes to review", async ({ page }) => {
  await login(page, demo("trainer"));
  await page.goto("/en/trainer/profile");
  await page.getByLabel("Headline (English)").fill("Robotics trainer (demo, edited)");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Waiting for review").first()).toBeVisible();
  await db("update trainer_profiles set status = 'published', headline_en = 'Robotics & electronics trainer (demo)' where trainer_id = '00000000-0000-4000-a000-000000000003'");
});
