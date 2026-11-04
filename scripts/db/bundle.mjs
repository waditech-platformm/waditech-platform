// Builds ONE SQL file (all migrations + fictional seed) for bootstrapping a NEW, empty staging project
// through a connector, and prints a fresh random demo password. The password is embedded only as a bcrypt hash.
// Usage: node scripts/db/bundle.mjs <out.sql>   (requires the local stack's Postgres for hashing)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/db/bundle.mjs <out.sql>");
const root = path.resolve(import.meta.dirname, "../..");
const password = `Wt-${crypto.randomBytes(9).toString("base64url")}`;
const c = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:54322/waditech" });
await c.connect();
const hash = (await c.query("select extensions.crypt($1, extensions.gen_salt('bf', 10)) h", [password])).rows[0].h;
await c.end();

const dir = path.join(root, "supabase/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
let sql = "-- WadiTech staging bootstrap (generated). Fictional demo data only.\n";
sql += "create schema if not exists supabase_migrations;\ncreate table if not exists supabase_migrations.schema_migrations (version text primary key, name text, applied_at timestamptz default now());\n";
for (const f of files) {
  sql += `\n-- ===== ${f}\n${fs.readFileSync(path.join(dir, f), "utf8")}\n`;
  sql += `insert into supabase_migrations.schema_migrations(version, name) values ('${f.split("_")[0]}', '${f}') on conflict do nothing;\n`;
}
// strip transaction control: the bundle is executed inside a single PL/pgSQL EXECUTE (already atomic)
let seed = fs.readFileSync(path.join(root, "supabase/seed.sql"), "utf8").replace(/^(begin|commit);\s*$/gim, "");
if (!seed.includes("extensions.crypt('Demo-Pass-2026!', extensions.gen_salt('bf'))")) throw new Error("seed password pattern not found");
seed = seed.replace("extensions.crypt('Demo-Pass-2026!', extensions.gen_salt('bf'))", `'${hash}'`).replace(/Demo-Pass-2026!/g, "(see handover)");
sql += `\n-- ===== seed.sql\n${seed}\n-- ===== seed-media.sql\n${fs.readFileSync(path.join(root, "supabase/seed-media.sql"), "utf8")}\n`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, sql);
console.log(JSON.stringify({ out, bytes: sql.length, password }));
