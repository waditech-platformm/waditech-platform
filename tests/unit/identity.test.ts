import { describe, expect, it } from "vitest";
import { registerSchema, resetSchema } from "@/features/identity/schemas";

const base = { full_name: "Test Student", email: "Student@Example.com ", password: "Abcdef12", confirm: "Abcdef12", account_type: "student", terms: "on" };

describe("registration validation", () => {
  it("accepts a valid student sign-up and normalises the email", () => {
    const r = registerSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("student@example.com");
  });
  it.each(["short1", "allletters", "12345678"])("rejects weak password %s", (pw) => {
    expect(registerSchema.safeParse({ ...base, password: pw, confirm: pw }).success).toBe(false);
  });
  it("rejects mismatched confirmation", () => {
    expect(registerSchema.safeParse({ ...base, confirm: "Abcdef13" }).success).toBe(false);
  });
  it.each(["admin", "super_admin", "trainer", "school_coordinator"])("never lets sign-up request the privileged role %s", (role) => {
    expect(registerSchema.safeParse({ ...base, account_type: role }).success).toBe(false);
  });
  it("requires accepting the terms", () => {
    expect(registerSchema.safeParse({ ...base, terms: undefined }).success).toBe(false);
  });
  it("validates password reset", () => {
    expect(resetSchema.safeParse({ password: "NewPass99", confirm: "NewPass99" }).success).toBe(true);
    expect(resetSchema.safeParse({ password: "NewPass99", confirm: "nope" }).success).toBe(false);
  });
});
