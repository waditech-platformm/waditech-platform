import pg from "pg";

// Local-only housekeeping before an E2E run: clear rate-limit counters and the captured mail inbox.
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54322/waditech";
  if (/supabase\.co/.test(url)) throw new Error("E2E global setup must never run against a hosted Supabase project");
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await c.query("delete from public.rate_limits");
  await c.end();
  await fetch("http://127.0.0.1:54321/__mail/clear").catch(() => undefined);
}
