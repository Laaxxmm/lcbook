import crypto from "node:crypto";

// Razorpay server logic (spec §9). key_secret NEVER leaves the server (no NEXT_PUBLIC_).
// We call the REST API with fetch + basic auth rather than pulling the SDK.
const RAZORPAY_API = "https://api.razorpay.com/v1";
const SOURCE = "publications" as const;

function keyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
}
function keySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET ?? "";
}
function basicAuth(): string {
  return "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/** Verify the X-Razorpay-Signature header on a webhook. Reject on mismatch (§9). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verify the Checkout callback signature (razorpay_order_id|razorpay_payment_id). */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret = keySecret(),
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

export interface RazorpayOrder {
  id: string;
}
export interface RazorpayRefund {
  id: string;
}

/** Create a Razorpay order: amount in paise, receipt = local id, notes.source tag (§9). */
export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
}): Promise<RazorpayOrder> {
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: { source: SOURCE },
    }),
  });
  if (!res.ok) throw new Error(`Razorpay order create failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as RazorpayOrder;
}

/** Create a refund for a captured payment (§9). Amount already net of retained fee. */
export async function createRefund(
  paymentId: string,
  amountPaise: number,
): Promise<RazorpayRefund> {
  const res = await fetch(`${RAZORPAY_API}/payments/${paymentId}/refund`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, notes: { source: SOURCE } }),
  });
  if (!res.ok) throw new Error(`Razorpay refund failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as RazorpayRefund;
}
