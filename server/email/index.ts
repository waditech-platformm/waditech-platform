import "server-only";
import { env } from "@/lib/env";

/**
 * Email delivery adapter. Providers:
 *  - "none"   (default): nothing is sent; notifications stay queued until a provider is configured.
 *  - "smtp"   : any SMTP server (SMTP_URL, e.g. smtp://user:pass@host:587). Used locally with the mail catcher.
 *  - "resend" : Resend HTTP API (RESEND_API_KEY).
 * Templates are bilingual and contain only the notification text and a link back to the platform: never grades,
 * payment details or other private data beyond what the in-app notification already shows to that user.
 */
/*
 * TODO(launch): EMAIL PROVIDER. EMAIL_PROVIDER=none on staging, so notification emails stay queued and sign-up / reset
 * emails come from Supabase's built-in sender (rate-limited, not for production).
 *   1. Choose Resend (simplest) or SMTP; verify the sending domain (SPF, DKIM, DMARC) for waditech.co.
 *   2. Vercel env: EMAIL_PROVIDER, EMAIL_FROM, RESEND_API_KEY or SMTP_URL, CRON_SECRET (the queue worker uses it).
 *   3. Supabase > Authentication > SMTP: point auth emails at the same provider, and set Site URL + redirect URLs.
 *   4. Contact-form staff alerts: see contactAction in features/engagement/actions.ts.
 */
export type OutgoingEmail ={ to: string; subject: string; html: string; text: string };
export interface EmailProvider {
  name: string;
  send(mail: OutgoingEmail): Promise<void>;
}

const noneProvider: EmailProvider = { name: "none", async send() { throw new Error("email provider not configured"); } };

function smtpProvider(url: string, from: string): EmailProvider {
  return {
    name: "smtp",
    async send(mail) {
      const nodemailer = await import("nodemailer");
      const t = nodemailer.createTransport(url);
      await t.sendMail({ from, ...mail });
    },
  };
}

function resendProvider(key: string, from: string): EmailProvider {
  return {
    name: "resend",
    async send(mail) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }),
      });
      if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    },
  };
}

export function emailProvider(): EmailProvider {
  const e = env();
  const from = e.EMAIL_FROM ?? "WadiTech Academy <no-reply@waditech.co>";
  if (e.EMAIL_PROVIDER === "smtp" && e.SMTP_URL) return smtpProvider(e.SMTP_URL, from);
  if (e.EMAIL_PROVIDER === "resend" && e.RESEND_API_KEY) return resendProvider(e.RESEND_API_KEY, from);
  return noneProvider;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type QueuedNotification = {
  email: string; full_name: string | null; locale: string | null; title_en: string; title_ar: string;
  body_en: string | null; body_ar: string | null; link: string | null;
};

/** Builds a bilingual email (preferred language first). Links are restricted to the platform's own origin. */
export function renderNotificationEmail(n: QueuedNotification, siteUrl: string): OutgoingEmail {
  const ar = n.locale === "ar";
  const base = siteUrl.replace(/\/$/, "");
  const path = n.link && /^\/(?!\/)[A-Za-z0-9/_\-?=&.%]*$/.test(n.link) ? n.link : "/";
  const loc = ar ? "ar" : "en";
  const href = `${base}${/^\/(en|ar)(\/|$)/.test(path) ? path : `/${loc}${path === "/" ? "" : path}`}`;
  const title = ar ? n.title_ar : n.title_en;
  const blocks = [
    { dir: ar ? "rtl" : "ltr", lang: loc, title, body: (ar ? n.body_ar : n.body_en) ?? "", cta: ar ? "فتح المنصة" : "Open WadiTech" },
    { dir: ar ? "ltr" : "rtl", lang: ar ? "en" : "ar", title: ar ? n.title_en : n.title_ar, body: (ar ? n.body_en : n.body_ar) ?? "", cta: "" },
  ];
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Inter,Cairo,Arial,sans-serif;color:#0e1630">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#101c3d;padding:18px 24px;color:#fff;font-weight:800;letter-spacing:.5px">WADITECH ACADEMY <span style="color:#20c9cf;font-weight:600;font-size:11px;letter-spacing:3px">LEARN · BUILD · INNOVATE</span></td></tr>
${blocks.map((b, i) => `<tr><td dir="${b.dir}" lang="${b.lang}" style="padding:${i ? "0 24px 20px" : "24px 24px 12px"};text-align:${b.dir === "rtl" ? "right" : "left"}">
<p style="margin:0 0 6px;font-size:${i ? 14 : 18}px;font-weight:700">${esc(b.title)}</p>${b.body ? `<p style="margin:0;font-size:${i ? 13 : 15}px;line-height:1.6;color:#4a5578">${esc(b.body)}</p>` : ""}
${b.cta ? `<p style="margin:18px 0 8px"><a href="${esc(href)}" style="display:inline-block;background:#2456d3;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:10px">${b.cta}</a></p>` : ""}</td></tr>`).join("")}
<tr><td style="padding:14px 24px;border-top:1px solid #e3e8f2;font-size:11px;color:#586283">You receive this because you have a WadiTech Academy account. · وصلتك هذه الرسالة لأن لديك حسابًا في أكاديمية وادي تك.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${title}\n\n${blocks[0].body}\n\n${href}\n\n-\n${blocks[1].title}\n${blocks[1].body}`;
  return { to: n.email, subject: `${title} · WadiTech Academy`, html, text };
}
