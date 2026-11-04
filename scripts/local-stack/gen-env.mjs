// Generates .env.local for the docker-free local stack (anon + service_role JWTs signed with the local dev secret).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const secret = process.env.LOCAL_JWT_SECRET ?? "super-secret-jwt-token-with-at-least-32-characters-long";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (payload) => {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
};
const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
const anon = sign({ iss: "waditech-local", role: "anon", exp });
const service = sign({ iss: "waditech-local", role: "service_role", exp });
const file = path.resolve(import.meta.dirname, "../../.env.local");
const env = `# Generated for the LOCAL development stack only. Do not use these keys anywhere else.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${service}
APP_ENV=development
PAYMENTS_PROVIDER=sandbox
PAYMENTS_SANDBOX_SECRET=${crypto.randomBytes(24).toString("hex")}
AI_PROVIDER=local
DEV_MAIL_URL=http://127.0.0.1:54321/__mail
EMAIL_PROVIDER=smtp
SMTP_URL=smtp://dev:dev@127.0.0.1:54325
EMAIL_FROM=WadiTech Academy (DEV) <no-reply@waditech.local>
CRON_SECRET=${crypto.randomBytes(24).toString("hex")}
`;
fs.writeFileSync(file, env);
console.log(`wrote ${file}`);
