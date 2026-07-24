import { Resend } from "resend";

// Minimal transactional send for the two admin-only emails that have no template in the
// frozen lib/email module (§14): the admin sign-in magic link, and the "cancellation
// declined" customer notice. Same sender identity as lib/email (§11) — orders@learncrew.org,
// reply-to support@. SERVER-ONLY (reads RESEND_API_KEY). Kept tiny on purpose: reusing
// lib/email's private send()/layout would mean editing that frozen file.
const FROM = process.env.EMAIL_FROM ?? "orders@learncrew.org";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "support@learncrew.org";
const C = { green800: "#0E3B2E", gold: "#E8A33D", cream: "#FAF7F2", border: "#E6E0D5", muted: "#4A554E" };
const FONT = "'Plus Jakarta Sans',system-ui,-apple-system,sans-serif";

let client: Resend | null = null;
function resend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  client ??= new Resend(key);
  return client;
}

function shell(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${C.cream};font-family:${FONT};color:${C.green800}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px">
  <tr><td style="background:${C.green800};border-radius:14px 14px 0 0;padding:18px 22px">
    <span style="font-size:19px;font-weight:800;letter-spacing:-.02em;color:${C.cream}">Learn Crew</span>
    <span style="font-size:12px;font-weight:600;color:${C.gold};margin-left:8px">Publications</span></td></tr>
  <tr><td style="background:#fff;border:1px solid ${C.border};border-top:0;border-radius:0 0 14px 14px;padding:26px 22px">
    <h1 style="margin:0 0 14px;font-size:19px;font-weight:700">${heading}</h1>${bodyHtml}</td></tr>
</table></td></tr></table></body></html>`;
}

export function para(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.green800}">${html}</p>`;
}

export function linkButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 16px"><tr><td style="background:${C.gold};border-radius:999px">
    <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#3A2A08;text-decoration:none">${label}</a></td></tr></table>`;
}

export async function sendAdminMail(to: string, subject: string, heading: string, bodyHtml: string): Promise<void> {
  await resend().emails.send({ from: FROM, to, replyTo: REPLY_TO, subject, html: shell(heading, bodyHtml) });
}
