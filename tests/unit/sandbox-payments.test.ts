import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key-placeholder-000000";
  process.env.APP_ENV = "development";
  process.env.PAYMENTS_PROVIDER = "sandbox";
  process.env.PAYMENTS_SANDBOX_SECRET = "unit-test-secret-0123456789abcdef";
});

describe("sandbox payment provider", () => {
  const order = { id: "11111111-2222-4333-8444-555555555555", total: 85, currency: "JOD" as const };

  it("verifies a genuinely signed successful outcome with the original amount", async () => {
    const { sandboxProvider, encodeSandboxOutcome, orderIdFromSandboxCheckout } = await import("@/server/payments/sandbox");
    const { checkoutId } = await sandboxProvider.createCheckout(order as never, "http://localhost:3000/return");
    expect(orderIdFromSandboxCheckout(checkoutId)).toBe(order.id);
    const r = await sandboxProvider.verify(encodeSandboxOutcome(checkoutId, "success"));
    expect(r.succeeded).toBe(true);
    expect(r.amount).toBe(85);
    expect(r.currency).toBe("JOD");
  });

  it("rejects a checkout whose amount was tampered with on the client", async () => {
    const { sandboxProvider, encodeSandboxOutcome } = await import("@/server/payments/sandbox");
    const { checkoutId } = await sandboxProvider.createCheckout(order as never, "http://localhost:3000/return");
    const [p0, s0] = checkoutId.split(".");
    const payload = JSON.parse(Buffer.from(p0.slice(4), "base64url").toString());
    payload.a = 0.001;
    const forged = `sbx_${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${s0}`;
    await expect(sandboxProvider.verify(encodeSandboxOutcome(forged, "success"))).rejects.toThrow();
  });

  it("rejects an outcome with a forged signature", async () => {
    const { sandboxProvider } = await import("@/server/payments/sandbox");
    const { checkoutId } = await sandboxProvider.createCheckout(order as never, "http://localhost:3000/return");
    await expect(sandboxProvider.verify(`${checkoutId}.success.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).rejects.toThrow();
  });

  it("reports a declined outcome as not succeeded", async () => {
    const { sandboxProvider, encodeSandboxOutcome } = await import("@/server/payments/sandbox");
    const { checkoutId } = await sandboxProvider.createCheckout(order as never, "http://localhost:3000/return");
    const r = await sandboxProvider.verify(encodeSandboxOutcome(checkoutId, "failure"));
    expect(r.succeeded).toBe(false);
  });
});
