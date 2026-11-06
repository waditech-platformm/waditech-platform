import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { demo, login } from "./helpers";

// WCAG 2.1 AA automated checks (axe-core). Automated checks catch roughly a third of issues;
// manual keyboard and screen-reader review is still listed in docs/TEST_PLAN.md.
const PUBLIC = ["/en", "/ar", "/en/programs", "/ar/programs", "/en/programs/robotics-foundations", "/en/news", "/en/events", "/en/labs", "/en/contact", "/en/login", "/ar/register", "/en/verify", "/en/trainers", "/ar/trainers/demo-lina", "/en/library", "/ar/library"];

for (const path of PUBLIC) {
  test(`no serious accessibility violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });
}

test("no serious accessibility violations: student dashboard", async ({ page }) => {
  await login(page, demo("student"));
  await page.goto("/en/dashboard");
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
});
