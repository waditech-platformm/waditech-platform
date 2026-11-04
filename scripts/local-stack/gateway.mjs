// Local API gateway that mimics the Supabase URL layout (Kong in the official stack)
// plus a development mail catcher (Inbucket in the official stack).
// DEVELOPMENT ONLY — never deploy.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 54321;
const ROUTES = [
  { prefix: "/auth/v1", target: { host: "127.0.0.1", port: 9999 } },
  { prefix: "/rest/v1", target: { host: "127.0.0.1", port: 54330 } },
];
const mails = [];

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/__health") return res.end("ok");
  if (url.pathname.startsWith("/__templates/")) {
    const file = path.join(ROOT, "supabase/templates", path.basename(url.pathname));
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
    res.setHeader("content-type", "text/html; charset=utf-8");
    return res.end(fs.readFileSync(file));
  }
  if (url.pathname === "/__mail") {
    const to = url.searchParams.get("to");
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify(to ? mails.filter((m) => m.to.includes(to.toLowerCase())) : mails));
  }
  if (url.pathname === "/__mail/clear") { mails.length = 0; return res.end("ok"); }

  // CORS for browser calls from the Next app (localhost:3000)
  res.setHeader("access-control-allow-origin", req.headers.origin ?? "*");
  res.setHeader("access-control-allow-credentials", "true");
  res.setHeader("access-control-allow-headers", req.headers["access-control-request-headers"] ?? "*");
  res.setHeader("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("access-control-expose-headers", "content-range,x-total-count");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }

  const route = ROUTES.find((r) => url.pathname.startsWith(r.prefix));
  if (!route) { res.statusCode = 404; return res.end("no route"); }
  const upstreamPath = url.pathname.slice(route.prefix.length) + url.search || "/";
  const headers = { ...req.headers, host: `${route.target.host}:${route.target.port}` };
  const upstream = http.request(
    { ...route.target, method: req.method, path: upstreamPath, headers },
    (up) => {
      const h = { ...up.headers };
      delete h["access-control-allow-origin"];
      res.writeHead(up.statusCode ?? 502, h);
      up.pipe(res);
    },
  );
  upstream.on("error", (e) => { res.statusCode = 502; res.end(String(e)); });
  req.pipe(upstream);
});
server.listen(PORT, "127.0.0.1", () => console.log(`gateway on :${PORT}`));

const smtp = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  onAuth(_auth, _session, cb) { cb(null, { user: "dev" }); },
  onData(stream, _session, cb) {
    simpleParser(stream).then((m) => {
      const to = (Array.isArray(m.to) ? m.to : [m.to]).flatMap((t) => t?.value ?? []).map((v) => (v.address ?? "").toLowerCase());
      mails.push({ to, subject: m.subject ?? "", html: m.html || "", text: m.text ?? "", date: new Date().toISOString() });
      if (mails.length > 500) mails.shift();
      cb();
    }).catch(cb);
  },
});
smtp.listen(54325, "127.0.0.1", () => console.log("smtp catcher on :54325"));
