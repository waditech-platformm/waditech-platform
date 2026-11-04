// Applies supabase/migrations/*.sql in order (same files the Supabase CLI uses with `supabase db push`).
// Usage: node scripts/db/migrate.mjs [--seed] [--reset]
// Connects with DATABASE_URL (default: local stack). NEVER point this at production without approval.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54322/waditech";
if (/supabase\.co/.test(url) && process.env.I_HAVE_APPROVAL !== "yes") {
  console.error("Refusing to run against a hosted Supabase project without I_HAVE_APPROVAL=yes");
  process.exit(1);
}
const root = path.resolve(import.meta.dirname, "../..");
const client = new pg.Client({ connectionString: url });
await client.connect();

if (process.argv.includes("--reset")) {
  console.log("resetting public schema (local only)…");
  await client.query(`drop schema if exists public cascade; create schema public; drop schema if exists supabase_migrations cascade;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    delete from auth.users;`);
}

await client.query(`create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, name text, applied_at timestamptz default now())`);
const done = new Set((await client.query("select version from supabase_migrations.schema_migrations")).rows.map((r) => r.version));
const dir = path.join(root, "supabase/migrations");
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const version = file.split("_")[0];
  if (done.has(version)) continue;
  process.stdout.write(`applying ${file} … `);
  try {
    await client.query("begin");
    await client.query(fs.readFileSync(path.join(dir, file), "utf8"));
    await client.query("insert into supabase_migrations.schema_migrations(version, name) values ($1,$2)", [version, file]);
    await client.query("commit");
    console.log("ok");
  } catch (e) {
    await client.query("rollback");
    console.log("FAILED");
    console.error(e.message, e.position ? `(position ${e.position})` : "", e.where ?? "");
    process.exit(1);
  }
}
if (process.argv.includes("--seed")) {
  process.stdout.write("seeding fictional test data … ");
  await client.query(fs.readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
  await client.query(fs.readFileSync(path.join(root, "supabase/seed-media.sql"), "utf8"));
  console.log("ok");
}
await client.query("notify pgrst, 'reload schema'");
await client.end();
