// Transactional email (spec §11, Resend). From orders@learncrew.org via txn.learncrew.org,
// reply-to support@learncrew.org. SERVER-ONLY — reads RESEND_API_KEY / APP_URL off process.env.
//
// This module is the ACTUAL Resend send + the 8 HTML templates (§11). The thin adapters the
// state machine / webhook / admin call live in lib/notifications.ts and delegate here off the
// hot path (they enqueue a background job so a failed send can't roll back a committed order).
//
// Plain template functions only — no react-email, no new dep (§11). Inline styles + a
// table-based 600px layout so it survives Gmail/Outlook. Brand colours from §16, inlined.
import type { Order, User } from "@prisma/client";
import { LoginTokenType } from "@prisma/client";
import { Resend } from "resend";
import { buildInvoiceData, SELLER } from "@/lib/invoice";
import { renderBillOfSupply } from "@/lib/pdf/bill-of-supply";
import { formatRupees } from "@/lib/money";
import { EBOOK_URL, COURSE_URL, elearningUtm } from "@/config/elearning";
import type { SkuCode } from "@/lib/catalogue";

let client: Resend | null = null;
function resend(): Resend {
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

const FROM = process.env.EMAIL_FROM ?? "orders@learncrew.org";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "support@learncrew.org";
// Admin inbox for cancellation notices (§11 tpl 5). Falls back to the seller/support address.
const ADMIN = process.env.ADMIN_EMAIL ?? SELLER.email;
const appUrl = () => process.env.APP_URL ?? "";

interface Mail {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

async function send(m: Mail): Promise<void> {
  await resend().emails.send({
    from: FROM,
    to: m.to,
    replyTo: REPLY_TO,
    subject: m.subject,
    html: m.html,
    attachments: m.attachments,
  });
}

// ── brand tokens (§16), inlined because email clients strip <style>/CSS vars ──
const C = {
  green900: "#0A2C22",
  green800: "#0E3B2E",
  green400: "#4A554E",
  gold: "#E8A33D",
  onGold: "#3A2A08", // gold buttons always take this, never white (§16 WCAG)
  cream: "#FAF7F2",
  border: "#E6E0D5",
};
const FONT = "'Plus Jakarta Sans',system-ui,-apple-system,sans-serif";

// Digital-product prices (§3, paise). VISIBILITY is driven by URL presence in
// config/elearning.ts — never by price. The PGCET ebook destination is the "PGCET
// Mocks" product, so label it for what the buyer actually lands on (§3 defect 2).
const DIGITAL: Record<SkuCode, { ebookPaise: number; ebookLabel: string; coursePaise: number }> = {
  PGCET_MBA: { ebookPaise: 29_900, ebookLabel: "PGCET Mocks + eBook", coursePaise: 400_000 },
  PGCET_MCA: { ebookPaise: 34_900, ebookLabel: "PGCET Mocks + eBook", coursePaise: 400_000 },
  MAT: { ebookPaise: 34_900, ebookLabel: "eBook (1-year access)", coursePaise: 500_000 },
  CAT: { ebookPaise: 89_900, ebookLabel: "eBook (1-year access)", coursePaise: 0 },
  CLAT: { ebookPaise: 89_900, ebookLabel: "eBook (1-year access)", coursePaise: 0 },
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

// Shared shell: preheader + green header, cream card body, seller footer. Mobile-first 600px.
function layout(opts: { preheader: string; heading: string; body: string }): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:${FONT};color:${C.green800};-webkit-font-smoothing:antialiased">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:${C.green800};border-radius:14px 14px 0 0;padding:20px 24px">
    <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${C.cream}">Learn Crew</span>
    <span style="font-size:13px;font-weight:600;color:${C.gold};margin-left:8px">Publications</span>
  </td></tr>
  <tr><td style="background:#ffffff;border:1px solid ${C.border};border-top:0;border-radius:0 0 14px 14px;padding:28px 24px">
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${C.green800}">${esc(opts.heading)}</h1>
    ${opts.body}
  </td></tr>
  <tr><td style="padding:20px 24px;color:${C.green400};font-size:12px;line-height:1.6">
    <div style="font-weight:600;color:${C.green800}">${esc(SELLER.name)}</div>
    ${SELLER.address.map((l) => `<div>${esc(l)}</div>`).join("")}
    <div style="margin-top:6px">Questions? Reply to this email or write to <a href="mailto:${SELLER.email}" style="color:${C.green800}">${SELLER.email}</a> · ${esc(SELLER.phone)}</div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

const para = (html: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.green800}">${html}</p>`;

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 18px"><tr><td style="background:${C.gold};border-radius:999px">
    <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:${C.onGold};text-decoration:none">${esc(label)}</a>
  </td></tr></table>`;
}

// A quiet info panel (cream box + hairline) for policy / summary blocks.
function panel(inner: string): string {
  return `<div style="background:${C.cream};border:1px solid ${C.border};border-radius:12px;padding:16px 18px;margin:0 0 18px">${inner}</div>`;
}

// "Track my order" link. ponytail: uses the durable order-id tracking page, not a 15-min
// magic link — a magic-link token (§8, 15-min TTL) is dead by the time a confirmation email
// is opened. The signed magic link lives in the login email (tpl 8) where it's used at once.
const trackUrl = (order: Order) => `${appUrl()}/track?order=${encodeURIComponent(order.id)}`;

// Delivery SLA copy (§7), driven by the fulfilment type decided at CONFIRMED.
function slaLine(order: Order): string {
  if (order.fulfilmentType === "IN_STOCK") return "In stock — dispatched in <strong>1–2 working days</strong>.";
  if (order.fulfilmentType === "POD") return "Printed to order — printed and dispatched in <strong>7–10 working days</strong>.";
  return "We'll email you the moment it's dispatched.";
}

// Cancellation policy line (§6/§9) — the window differs by fulfilment type.
function cancellationLine(order: Order): string {
  const base = "Cancellations are refunded minus payment gateway charges.";
  if (order.fulfilmentType === "POD")
    return `${base} A print-to-order set can be cancelled until printing starts — we'll email you when that window closes.`;
  return `${base} An in-stock set can be cancelled any time before it ships (AWB entered).`;
}

function orderSummary(order: Order): string {
  const rows = [
    ["Order", esc(order.id)],
    ["Set", `${esc(order.snapshotName)} · ${order.snapshotBookCount} books`],
    ["Quantity", String(order.qty)],
    ["Amount paid", `${formatRupees(order.amountPaise)} <span style="color:${C.green400};font-weight:400">(shipping included)</span>`],
  ];
  if (order.invoiceNumber) rows.push(["Bill of Supply", esc(order.invoiceNumber)]);
  return panel(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 0;color:${C.green400};width:40%">${k}</td><td style="padding:4px 0;font-weight:600;color:${C.green800}">${v}</td></tr>`,
      )
      .join("")}</table>`,
  );
}

// Upsell block (§11/§3). Show the ebook + course rows ONLY where a URL exists in
// config/elearning.ts (a missing URL hides that row); if both are missing, hide the whole
// panel. Course includes ebook + mocks; both are non-refundable. Appends the referral UTM
// + order id, and surfaces the per-order 10%-off course code stored at CONFIRMED.
function upsellBlock(order: Order): string {
  const sku = order.skuCode as SkuCode;
  const d = DIGITAL[sku];
  const ebookHref = EBOOK_URL[sku];
  const courseHref = COURSE_URL[sku];
  if (!d || (!ebookHref && !courseHref)) return ""; // both missing → no panel

  const rows: string[] = [];
  if (ebookHref) {
    rows.push(
      `<div style="padding:10px 0;border-bottom:1px solid ${C.border}">
        <div style="font-weight:600;color:${C.green800}">${esc(d.ebookLabel)} — ${formatRupees(d.ebookPaise)}</div>
        <div style="font-size:12px;color:${C.green400};margin:2px 0 8px">1-year access on our learning platform (opens as a "course" on WiseApp — this is the eBook).</div>
        ${button(ebookHref + elearningUtm(order.id), "Get the eBook")}
      </div>`,
    );
  }
  if (courseHref) {
    const code = order.discountCode;
    rows.push(
      `<div style="padding:10px 0">
        <div style="font-weight:600;color:${C.green800}">Recorded course — ${formatRupees(d.coursePaise)}</div>
        <div style="font-size:12px;color:${C.green400};margin:2px 0 8px">Includes the eBook and mock tests. 1-year access.</div>
        ${button(courseHref + elearningUtm(order.id), "View the course")}
        ${
          code
            ? `<div style="font-size:13px;color:${C.green800}">Your code <strong style="font-family:monospace;background:${C.cream};border:1px solid ${C.border};border-radius:6px;padding:2px 6px">${esc(code)}</strong> takes <strong>10% off</strong> the course — valid 60 days, redeemed at checkout on our learning platform.</div>`
            : ""
        }
      </div>`,
    );
  }

  return (
    `<h2 style="font-size:15px;font-weight:700;color:${C.green800};margin:22px 0 4px">Prepare digitally too</h2>` +
    `<p style="margin:0 0 10px;font-size:13px;color:${C.green400}">Buying the printed set doesn't include digital access. eBooks and recorded courses are <strong>non-refundable</strong>.</p>` +
    panel(rows.join(""))
  );
}

// ── 8 templates (§11) ──────────────────────────────────────────────────────

// 1. Payment confirmed — summary, Bill of Supply PDF attached, SLA, track link,
//    cancellation policy incl. gateway charge, upsell block, discount code (§11, §12).
export async function sendOrderConfirmation(order: Order): Promise<void> {
  const pdf = await renderBillOfSupply(buildInvoiceData(order));
  const filename = `${(order.invoiceNumber ?? order.id).replace(/\//g, "-")}.pdf`;
  const body =
    para(`Hi ${esc(order.customerName)}, thanks — we've received your payment of <strong>${formatRupees(order.amountPaise)}</strong> for the ${esc(order.snapshotName)}.`) +
    orderSummary(order) +
    para(slaLine(order)) +
    para(`Your <strong>Bill of Supply</strong> is attached to this email as a PDF.`) +
    button(trackUrl(order), "Track my order") +
    panel(`<div style="font-size:13px;color:${C.green400};line-height:1.6">${cancellationLine(order)}</div>`) +
    upsellBlock(order);
  await send({
    to: order.customerEmail,
    subject: `Order ${order.id} confirmed — Learn Crew Publications`,
    html: layout({ preheader: `Payment received for ${order.snapshotName}. Bill of Supply attached.`, heading: "Payment confirmed", body }),
    attachments: [{ filename, content: pdf }],
  });
}

// 2. Print started (POD only) — the cancellation window has CLOSED (§6, §11).
export async function sendPrintStarted(order: Order): Promise<void> {
  const body =
    para(`Hi ${esc(order.customerName)}, printing has begun on your ${esc(order.snapshotName)} (order ${esc(order.id)}).`) +
    panel(`<div style="font-size:14px;color:${C.green800}">This order <strong>can no longer be cancelled</strong> — printing is under way. It'll be dispatched within 7–10 working days of your order.</div>`) +
    button(trackUrl(order), "Track my order");
  await send({
    to: order.customerEmail,
    subject: `Your order ${order.id} is now printing`,
    html: layout({ preheader: "Printing has started — cancellation window closed.", heading: "Your order is printing", body }),
  });
}

// 3. Dispatched — AWB, courier, tracking deep link (§11).
export async function sendDispatched(order: Order): Promise<void> {
  const details = panel(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
      ${order.courier ? `<tr><td style="padding:4px 0;color:${C.green400};width:40%">Courier</td><td style="padding:4px 0;font-weight:600">${esc(order.courier)}</td></tr>` : ""}
      ${order.awb ? `<tr><td style="padding:4px 0;color:${C.green400}">AWB</td><td style="padding:4px 0;font-weight:600">${esc(order.awb)}</td></tr>` : ""}
    </table>`,
  );
  const body =
    para(`Hi ${esc(order.customerName)}, your ${esc(order.snapshotName)} is on its way.`) +
    (order.awb || order.courier ? details : "") +
    button(trackUrl(order), "Track my order");
  await send({
    to: order.customerEmail,
    subject: `Order ${order.id} dispatched`,
    html: layout({ preheader: `On its way${order.courier ? ` via ${order.courier}` : ""}.`, heading: "Your order is on the way", body }),
  });
}

// 4. Delivered (§11).
export async function sendDelivered(order: Order): Promise<void> {
  const body =
    para(`Hi ${esc(order.customerName)}, your ${esc(order.snapshotName)} has been delivered. We hope it helps your prep.`) +
    para(`Damage in transit? Reply within 48 hours and we'll arrange a replacement.`);
  await send({
    to: order.customerEmail,
    subject: `Order ${order.id} delivered`,
    html: layout({ preheader: "Your books have arrived.", heading: "Delivered", body }),
  });
}

// 5. Cancellation requested — to the customer AND admin (§11). Never auto-refunds.
export async function sendCancellationRequested(order: Order): Promise<void> {
  const body =
    para(`We've received a cancellation request for order <strong>${esc(order.id)}</strong> (${esc(order.snapshotName)}).`) +
    para(`Our team will review it shortly. If approved, your refund is the amount paid <strong>minus payment gateway charges</strong>${order.cancelReason ? `. Reason noted: "${esc(order.cancelReason)}"` : ""}.`) +
    button(trackUrl(order), "Track my order");
  await send({
    to: [order.customerEmail, ADMIN],
    subject: `Cancellation requested — ${order.id}`,
    html: layout({ preheader: `Cancellation requested for ${order.id}.`, heading: "Cancellation requested", body }),
  });
}

// 6. Refund initiated — amount, gateway charge retained, timeline (§9, §11).
export async function sendRefundInitiated(order: Order): Promise<void> {
  const refund = order.refundAmountPaise != null ? formatRupees(order.refundAmountPaise) : "your refund";
  const retained = order.gatewayFeeRetainedPaise != null ? formatRupees(order.gatewayFeeRetainedPaise) : null;
  const body =
    para(`Hi ${esc(order.customerName)}, we've initiated a refund of <strong>${refund}</strong> for order ${esc(order.id)}.`) +
    panel(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
        <tr><td style="padding:4px 0;color:${C.green400};width:55%">Amount paid</td><td style="padding:4px 0;font-weight:600">${formatRupees(order.amountPaise)}</td></tr>
        ${retained ? `<tr><td style="padding:4px 0;color:${C.green400}">Gateway charge retained</td><td style="padding:4px 0;font-weight:600">− ${retained}</td></tr>` : ""}
        <tr><td style="padding:6px 0 0;color:${C.green800};font-weight:700;border-top:1px solid ${C.border}">Refund</td><td style="padding:6px 0 0;font-weight:700;border-top:1px solid ${C.border}">${refund}</td></tr>
      </table>`,
    ) +
    para(`It reaches your original payment method in <strong>5–7 working days</strong>. We'll email you again once it's complete.`);
  await send({
    to: order.customerEmail,
    subject: `Refund initiated — ${order.id}`,
    html: layout({ preheader: `Refund of ${refund} initiated.`, heading: "Refund initiated", body }),
  });
}

// 7. Refund completed (§11).
export async function sendRefundCompleted(order: Order): Promise<void> {
  const refund = order.refundAmountPaise != null ? formatRupees(order.refundAmountPaise) : "your refund";
  const body =
    para(`Hi ${esc(order.customerName)}, your refund of <strong>${refund}</strong> for order ${esc(order.id)} is complete.`) +
    para(`If it isn't visible on your statement yet, allow another day or two for your bank to post it.`);
  await send({
    to: order.customerEmail,
    subject: `Refund completed — ${order.id}`,
    html: layout({ preheader: `Refund of ${refund} completed.`, heading: "Refund completed", body }),
  });
}

// 8. Login OTP / magic link (§8, §11). OTP is a 6-digit CODE (not a link); the magic
//    link is a signed, single-use, 15-minute URL built by the auth caller from the token.
export async function sendLoginToken(user: User, token: string, type: LoginTokenType): Promise<void> {
  const isOtp = type === LoginTokenType.OTP;
  const body = isOtp
    ? para(`Your 6-digit Learn Crew login code is:`) +
      `<div style="font-size:30px;font-weight:800;letter-spacing:6px;color:${C.green800};margin:0 0 14px">${esc(token)}</div>` +
      para(`It expires in <strong>15 minutes</strong>. If you didn't request it, you can ignore this email.`)
    : para(`Tap below to sign in and track your orders. This link is single-use and expires in <strong>15 minutes</strong>.`) +
      button(`${appUrl()}/track?token=${encodeURIComponent(token)}`, "Sign in / Track my order") +
      para(`<span style="font-size:13px;color:${C.green400}">If you didn't request this, you can safely ignore it.</span>`);
  await send({
    to: user.email,
    subject: isOtp ? "Your Learn Crew login code" : "Sign in to Learn Crew Publications",
    html: layout({ preheader: isOtp ? "Your 6-digit login code." : "Your sign-in link.", heading: isOtp ? "Your login code" : "Sign in", body }),
  });
}
