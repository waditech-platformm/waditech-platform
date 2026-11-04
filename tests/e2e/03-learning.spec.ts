import { expect, test } from "@playwright/test";
import { createConfirmedUser, db, demo, login } from "./helpers";

const stamp = Date.now();
const email = `e2e-learner-${stamp}@test.local`;
const password = "Learner-Pass-77";
const learnerName = `E2E Learner ${stamp}`;
let studentId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  studentId = (await createConfirmedUser(email, password, learnerName)).id;
});

test("student enrolls in a free course and opens lessons", async ({ page }) => {
  await login(page, email, password);
  await page.goto("/en/programs/robotics-foundations");
  await page.getByRole("button", { name: "Enroll for free" }).click();
  await expect.poll(async () => (await db("select e.status from enrollments e join courses c on c.id=e.course_id where c.slug='robotics-foundations' and e.student_id=$1", [studentId]))[0]?.status).toBe("active");

  await page.goto("/en/learn/robotics-foundations");
  await expect(page.locator("main")).toContainText("Welcome: what is a robot?");
  await page.getByRole("link", { name: /Welcome: what is a robot\?/ }).first().click();
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect.poll(async () => (await db("select count(*)::int n from lesson_progress p join lessons l on l.id=p.lesson_id where p.student_id=$1 and p.completed_at is not null", [studentId]))[0].n).toBeGreaterThanOrEqual(1);
});

test("quiz is graded on the server and progress updates", async ({ page }) => {
  await login(page, email, password);
  const [lesson] = await db<{ id: string; assessment_id: string }>("select l.id, l.assessment_id from lessons l join courses c on c.id=l.course_id where c.slug='robotics-foundations' and l.type='quiz'");
  await page.goto(`/en/learn/robotics-foundations/${lesson.id}`);
  const start = page.getByRole("link", { name: /start|begin|take/i }).or(page.getByRole("button", { name: /start|begin|take/i })).first();
  if (await start.isVisible().catch(() => false)) await start.click();
  await page.waitForURL(/quiz/);
  await page.getByRole("button", { name: "Start attempt" }).click();
  await expect(page.getByRole("button", { name: "Submit answers" })).toBeVisible();
  // Choose the correct options using the answer key that only the database (not the browser) holds.
  const keys = await db<{ question_id: string; correct_option_ids: string[] | null }>(
    "select question_id, correct_option_ids from question_keys k join questions q on q.id=k.question_id where q.assessment_id=$1",
    [lesson.assessment_id],
  );
  for (const k of keys) for (const opt of k.correct_option_ids ?? []) await page.locator(`input[value="${opt}"]`).check();
  page.on("dialog", (dlg) => dlg.accept());
  await page.getByRole("button", { name: "Submit answers" }).click();
  await expect.poll(async () => (await db<{ passed: boolean }>("select passed from assessment_attempts where student_id=$1 and assessment_id=$2 and submitted_at is not null order by submitted_at desc limit 1", [studentId, lesson.assessment_id]))[0]?.passed).toBe(true);
  // the quiz lesson is now complete (rule: quiz_pass)
  await expect.poll(async () => (await db("select count(*)::int n from lesson_progress where student_id=$1 and lesson_id=$2 and completed_at is not null", [studentId, lesson.id]))[0].n).toBe(1);
});

test("student submits an assignment and the trainer grades it", async ({ browser }) => {
  const s = await browser.newPage();
  await login(s, email, password);
  const [a] = await db<{ id: string }>("select a.id from assignments a join courses c on c.id=a.course_id where c.slug='robotics-foundations'");
  await s.goto(`/en/learn/robotics-foundations/assignment/${a.id}`);
  await s.locator("#body_text").fill("My robot uses an ultrasonic sensor to stop 10 cm before obstacles, then turns right.");
  await s.getByRole("button", { name: "Submit assignment" }).click();
  await expect.poll(async () => (await db("select status from submissions where student_id=$1 and assignment_id=$2", [studentId, a.id]))[0]?.status).toBe("submitted");
  await s.close();

  const t = await browser.newPage();
  await login(t, demo("trainer"));
  await t.goto("/en/trainer/submissions");
  const [sub] = await db<{ id: string }>("select id from submissions where student_id=$1 and assignment_id=$2", [studentId, a.id]);
  await t.locator(`#g-${sub.id}`).fill("18");
  await t.locator(`#f-${sub.id}`).fill("Great sensor logic — try tuning the turn angle.");
  await t.locator("form").filter({ has: t.locator(`#g-${sub.id}`) }).getByRole("button", { name: "Save grade" }).click();
  await expect.poll(async () => (await db<{ status: string }>("select status from submissions where id=$1", [sub.id]))[0]).toMatchObject({ status: "graded" });
  await t.close();
});

test("trainer marks the course completed, issues a certificate, and it verifies publicly", async ({ browser }) => {
  const t = await browser.newPage();
  await login(t, demo("trainer"));
  await t.goto("/en/trainer/courses/0c000000-0000-4000-a000-000000000001");
  const row = t.locator("tr").filter({ hasText: learnerName });
  await row.getByRole("button", { name: "Mark course completed" }).click();
  await expect.poll(async () => (await db("select status from enrollments where student_id=$1 and course_id='0c000000-0000-4000-a000-000000000001'", [studentId]))[0]?.status).toBe("completed");
  await t.reload();
  await t.locator("tr").filter({ hasText: learnerName }).getByRole("button", { name: "Issue certificate" }).click();
  await expect.poll(async () => (await db("select count(*)::int n from certificates where student_id=$1", [studentId]))[0].n).toBe(1);
  const [cert] = await db<{ certificate_number: string }>("select certificate_number from certificates where student_id=$1", [studentId]);
  await t.close();

  const s = await browser.newPage();
  await login(s, email, password);
  await s.goto("/en/dashboard/certificates");
  await expect(s.locator("main")).toContainText(cert.certificate_number);
  await s.goto(`/en/certificates/${cert.certificate_number}`);
  await expect(s.locator("body")).toContainText(learnerName);
  await s.close();

  const anon = await browser.newPage();
  await anon.goto(`/en/verify?n=${cert.certificate_number}`);
  await expect(anon.locator("main")).toContainText(cert.certificate_number);
  await expect(anon.locator("main")).not.toContainText(email);
  await anon.close();
});

test("paid course: sandbox checkout activates the enrollment only after verified payment", async ({ page }) => {
  await login(page, email, password);
  await page.goto("/en/programs/python-for-young-coders");
  await page.getByRole("button", { name: "Enroll now" }).click();
  await page.waitForURL(/checkout/);
  const [e] = await db<{ status: string }>("select e.status from enrollments e join courses c on c.id=e.course_id where c.slug='python-for-young-coders' and e.student_id=$1", [studentId]);
  expect(e.status).not.toBe("active");
  await page.getByRole("button", { name: "Pay securely" }).click();
  await page.getByRole("button", { name: /simulate.*success/i }).click();
  await expect.poll(async () => (await db("select e.status from enrollments e join courses c on c.id=e.course_id where c.slug='python-for-young-coders' and e.student_id=$1", [studentId]))[0]?.status, { timeout: 15_000 }).toBe("active");
  const [o] = await db<{ status: string; total: string }>("select o.status, o.total::text from orders o join enrollments e on e.id=o.enrollment_id join courses c on c.id=e.course_id where c.slug='python-for-young-coders' and e.student_id=$1 order by o.created_at desc limit 1", [studentId]);
  expect(o.status).toBe("paid");
  expect(Number(o.total)).toBe(85);
});
