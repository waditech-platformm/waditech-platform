import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("authored content rendering (stored-XSS protection)", () => {
  it("escapes raw HTML", () => {
    const out = renderMarkdown("Hello <script>alert(1)</script> <img src=x onerror=alert(1)>");
    expect(out).not.toContain("<script>");
    expect(out).not.toMatch(/<img[^>]*onerror/);
  });
  it("neutralises javascript: links", () => {
    expect(renderMarkdown("[x](javascript:alert(1))")).not.toContain("javascript:");
  });
  it("keeps safe links and opens external ones safely", () => {
    const out = renderMarkdown("[site](https://waditech.co)");
    expect(out).toContain('href="https://waditech.co"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});
