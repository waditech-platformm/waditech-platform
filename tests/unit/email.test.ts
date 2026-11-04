import { describe, expect, it } from "vitest";
import { renderNotificationEmail } from "@/server/email";

const base = { email: "parent@example.com", full_name: "Huda", title_en: "Certificate issued", title_ar: "تم إصدار الشهادة", body_en: "Robotics Foundations", body_ar: "أساسيات الروبوتات", link: "/dashboard/certificates" };

describe("notification email rendering", () => {
  it("puts the preferred language first and links back to the platform with the locale", () => {
    const ar = renderNotificationEmail({ ...base, locale: "ar" }, "https://app.example.com/");
    expect(ar.subject).toContain("تم إصدار الشهادة");
    expect(ar.html.indexOf("تم إصدار الشهادة")).toBeLessThan(ar.html.indexOf("Certificate issued"));
    expect(ar.html).toContain('href="https://app.example.com/ar/dashboard/certificates"');
    const en = renderNotificationEmail({ ...base, locale: "en" }, "https://app.example.com");
    expect(en.html).toContain('href="https://app.example.com/en/dashboard/certificates"');
  });
  it("never links outside the platform", () => {
    for (const link of ["https://evil.example/phish", "//evil.example", "javascript:alert(1)"]) {
      const m = renderNotificationEmail({ ...base, locale: "en", link }, "https://app.example.com");
      expect(m.html).not.toContain("evil.example");
      expect(m.html).not.toContain("javascript:");
      expect(m.html).toContain('href="https://app.example.com/en"');
    }
  });
  it("escapes HTML in titles and bodies", () => {
    const m = renderNotificationEmail({ ...base, locale: "en", title_en: "<script>x</script>", body_en: '"><img src=x onerror=alert(1)>' }, "https://a.example");
    expect(m.html).not.toContain("<script>x");
    expect(m.html).not.toContain("<img src=x");
  });
});
