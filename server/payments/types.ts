export type OrderForPayment = { id: string; order_number: string; total: number; currency: "JOD" | "USD"; user_email: string };
export type VerifiedResult = { succeeded: boolean; pending: boolean; reference: string; amount: number; currency: "JOD" | "USD"; code: string; description: string; sandbox: boolean };
export interface PaymentProvider {
  readonly name: "sandbox" | "hyperpay";
  readonly isSandbox: boolean;
  /** Creates a provider checkout. Never receives card data. */
  createCheckout(order: OrderForPayment, returnUrl: string): Promise<{ checkoutId: string; widgetScriptUrl?: string }>;
  /** Server-to-server verification. The ONLY source of truth for payment status. */
  verify(checkoutId: string): Promise<VerifiedResult>;
}
/** Minor units per ISO-4217 (JOD has 3 decimals). */
export const minorUnits = (c: string) => (c === "JOD" ? 3 : 2);
export const formatAmount = (n: number, c: string) => n.toFixed(minorUnits(c));
