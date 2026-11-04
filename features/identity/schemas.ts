import { z } from "zod";

export const password = z.string().min(8, "password").max(72, "max").regex(/[A-Za-z]/, "password").regex(/[0-9]/, "password");
export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "min").max(120, "max"),
    email: z.string().trim().toLowerCase().email("email").max(254),
    password,
    confirm: z.string(),
    account_type: z.enum(["student", "parent"]),
    terms: z.literal("on", { message: "terms" }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "password" });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("email"),
  password: z.string().min(1, "required"),
});
export const emailSchema = z.object({ email: z.string().trim().toLowerCase().email("email") });
export const resetSchema = z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "password" });
export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "min").max(120, "max"),
  phone: z.string().trim().max(32, "max").optional().or(z.literal("")),
  preferred_locale: z.enum(["en", "ar"]),
});
