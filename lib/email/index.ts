// Transactional email (spec §11, Resend). From orders@learncrew.org via txn.learncrew.org,
// reply-to support@learncrew.org. SERVER-ONLY. These are the typed call sites the state
// machine / webhook / admin invoke; the email agent enriches the HTML templates.
//
// ponytail: bodies are minimal-but-real Resend sends so the contract compiles and works
// end-to-end today. Full templates 1–8 (§11) — SLA copy, magic link, cancellation policy,
// upsell block, discount code — are TODO(email agent) and marked inline.
import type { Order, User } from "@prisma/client";
import { LoginTokenType } from "@prisma/client";
import { Resend } from "resend";
import { buildInvoiceData, SELLER } from "@/lib/invoice";
import { renderBillOfSupply } from "@/lib/pdf/bill-of-supply";
import { formatRupees } from "@/lib/money";

let client: Resend | null = null;
function resend(): Resend {
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

const FROM = process.env.EMAIL_FROM ?? "orders@learncrew.org";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "support@learncrew.org";

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

const p = (html: string) => `<p style="font-family:system-ui,sans-serif">${html}</p>`;

// 1. Payment confirmed — summary + Bill of Supply PDF attached (§11, §12).
export async function sendOrderConfirmation(order: Order): Promise<void> {
  const pdf = await renderBillOfSupply(buildInvoiceData(order));
  const filename = `${(order.invoiceNumber ?? order.id).replace(/\//g, "-")}.pdf`;
  await send({
    to: order.customerEmail,
    subject: `Order ${order.id} confirmed — Learn Crew Publications`,
    // TODO(email agent): template 1 — delivery SLA, magic link, cancellation policy
    // incl. gateway charge, upsell block, per-order discount code.
    html:
      p(`Hi ${order.customerName}, we've received your payment of ${formatRupees(order.amountPaise)} for ${order.snapshotName}.`) +
      p(`Your Bill of Supply is attached.`),
    attachments: [{ filename, content: pdf }],
  });
}

// 2. Print started (POD only) — cancellation window has CLOSED (§6, §11).
export async function sendPrintStarted(order: Order): Promise<void> {
  await send({
    to: order.customerEmail,
    subject: `Your order ${order.id} is now printing`,
    html: p(`Hi ${order.customerName}, printing has begun on ${order.snapshotName}. This order can no longer be cancelled.`),
  });
}

// 3. Dispatched — AWB, courier, tracking deep link (§11).
export async function sendDispatched(order: Order): Promise<void> {
  await send({
    to: order.customerEmail,
    subject: `Order ${order.id} dispatched`,
    html: p(`Hi ${order.customerName}, your order is on the way${order.courier ? ` via ${order.courier}` : ""}${order.awb ? ` (AWB ${order.awb})` : ""}.`),
  });
}

// 4. Delivered (§11).
export async function sendDelivered(order: Order): Promise<void> {
  await send({
    to: order.customerEmail,
    subject: `Order ${order.id} delivered`,
    html: p(`Hi ${order.customerName}, your order has been delivered. Thank you.`),
  });
}

// 5. Cancellation requested — to customer AND admin (§11).
export async function sendCancellationRequested(order: Order): Promise<void> {
  await send({
    to: [order.customerEmail, SELLER.email],
    subject: `Cancellation requested — ${order.id}`,
    html: p(`Cancellation requested for ${order.id} (${order.snapshotName}). Admin will review; refunds are minus gateway charges.`),
  });
}

// 6. Refund initiated — amount, gateway charge retained, timeline (§9, §11).
export async function sendRefundInitiated(order: Order): Promise<void> {
  const refund = order.refundAmountPaise != null ? formatRupees(order.refundAmountPaise) : "—";
  const retained =
    order.gatewayFeeRetainedPaise != null ? formatRupees(order.gatewayFeeRetainedPaise) : "—";
  await send({
    to: order.customerEmail,
    subject: `Refund initiated — ${order.id}`,
    html: p(`We've initiated a refund of ${refund} for ${order.id} (gateway charge retained: ${retained}). It reaches your account in 5–7 working days.`),
  });
}

// 7. Refund completed (§11).
export async function sendRefundCompleted(order: Order): Promise<void> {
  const refund = order.refundAmountPaise != null ? formatRupees(order.refundAmountPaise) : "your refund";
  await send({
    to: order.customerEmail,
    subject: `Refund completed — ${order.id}`,
    html: p(`Your refund of ${refund} for ${order.id} is complete.`),
  });
}

// 8. Login OTP / magic link (§8, §11). OTP is a 6-digit code, magic link is a URL.
export async function sendLoginToken(
  user: User,
  token: string,
  type: LoginTokenType,
): Promise<void> {
  const isOtp = type === LoginTokenType.OTP;
  const html = isOtp
    ? p(`Your 6-digit login code is <strong>${token}</strong>. It expires in 15 minutes.`)
    : p(
        `<a href="${process.env.APP_URL ?? ""}/track?token=${token}">Track my order</a> — this link expires in 15 minutes.`,
      );
  await send({
    to: user.email,
    subject: isOtp ? "Your Learn Crew login code" : "Sign in to Learn Crew Publications",
    html,
  });
}
