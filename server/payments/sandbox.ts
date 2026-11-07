import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import type { PaymentProvider, VerifiedResult } from "./types";

/**
 * SANDBOX provider: simulates a hosted payment page. A checkout id is an HMAC-signed token
 * (order id, amount, currency, expiry) so the client can't forge one for a different amount.
 * Disabled automatically when APP_ENV=production.
 */
function secret() {
  const s = env().PAYMENTS_SANDBOX_SECRET;
  if (!s) throw new Error("PAYMENTS_SANDBOX_SECRET is required for the sandbox provider");
  if (env().APP_ENV === "production") throw new Error("Sandbox payments are disabled in production");
  return s;
}
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function encodeSandboxOutcome(checkoutId: string, outcome: "success" | "failure") {
  return `${checkoutId}.${outcome}.${sign(`${checkoutId}.${outcome}`)}`;
}

export const sandboxProvider: PaymentProvider = {
  name: "sandbox",
  isSandbox: true,
  async createCheckout(order) {
    const payload = Buffer.from(JSON.stringify({ o: order.id, a: order.total, c: order.currency, e: Date.now() + 30 * 60_000 })).toString("base64url");
    return { checkoutId: `sbx_${payload}.${sign(payload)}` };
  },
  async verify(token): Promise<VerifiedResult> {
    // token = <checkoutId>.<outcome>.<sig>  where checkoutId = sbx_<payload>.<sig>
    const parts = token.split(".");
    if (parts.length !== 4 || !parts[0].startsWith("sbx_")) throw new Error("invalid sandbox token");
    const [p0, s0, outcome, s1] = parts;
    const payload = p0.slice(4);
    const ok = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
    if (!ok(sign(payload), s0) || !ok(sign(`${p0}.${s0}.${outcome}`), s1)) throw new Error("bad sandbox signature");
    const { a, c, e, o } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { o: string; a: number; c: "JOD" | "USD"; e: number };
    if (Date.now() > e) throw new Error("sandbox checkout expired");
    const succeeded = outcome === "success";
    return { succeeded, pending: false, reference: `SBX-${o.slice(0, 8)}-${s1.slice(0, 10)}`, amount: a, currency: c,
      code: succeeded ? "000.100.110" : "800.100.151", description: succeeded ? "Sandbox: request successfully processed" : "Sandbox: transaction declined (simulated)", sandbox: true };
  },
};
export const orderIdFromSandboxCheckout = (checkoutId: string) => {
  const payload = checkoutId.split(".")[0]?.slice(4) ?? "";
  try { return (JSON.parse(Buffer.from(payload, "base64url").toString()) as { o: string }).o; } catch { return null; }
};
