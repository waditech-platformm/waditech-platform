import { z } from "zod";

/** Validated server/public environment. Fails fast with a readable message. */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PAYMENTS_PROVIDER: z.enum(["sandbox", "hyperpay"]).default("sandbox"),
  PAYMENTS_SANDBOX_SECRET: z.string().min(16).optional(),
  HYPERPAY_BASE_URL: z.string().url().default("https://eu-test.oppwa.com"),
  HYPERPAY_ACCESS_TOKEN: z.string().optional(),
  HYPERPAY_ENTITY_ID_VISA_MASTER: z.string().optional(),
  HYPERPAY_LIVE_ENABLED: z.enum(["true", "false"]).default("false"),
  AI_PROVIDER: z.enum(["local", "anthropic", "openai"]).default("local"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_DAILY_LIMIT: z.coerce.number().int().positive().default(30),
  AI_PAID_ENABLED: z.enum(["true", "false"]).default("false"),
  DEV_MAIL_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof schema>;
let cached: Env | null = null;
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_ENV: process.env.APP_ENV,
    PAYMENTS_PROVIDER: process.env.PAYMENTS_PROVIDER,
    PAYMENTS_SANDBOX_SECRET: process.env.PAYMENTS_SANDBOX_SECRET,
    HYPERPAY_BASE_URL: process.env.HYPERPAY_BASE_URL,
    HYPERPAY_ACCESS_TOKEN: process.env.HYPERPAY_ACCESS_TOKEN,
    HYPERPAY_ENTITY_ID_VISA_MASTER: process.env.HYPERPAY_ENTITY_ID_VISA_MASTER,
    HYPERPAY_LIVE_ENABLED: process.env.HYPERPAY_LIVE_ENABLED,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
    AI_DAILY_LIMIT: process.env.AI_DAILY_LIMIT,
    AI_PAID_ENABLED: process.env.AI_PAID_ENABLED,
    DEV_MAIL_URL: process.env.DEV_MAIL_URL,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration — ${issues}. See .env.example`);
  }
  if (parsed.data.APP_ENV === "production" && parsed.data.PAYMENTS_PROVIDER === "sandbox") {
    console.warn("[env] production is running with the sandbox payment provider");
  }
  cached = parsed.data;
  return cached;
}
export const isDev = () => env().APP_ENV !== "production";
