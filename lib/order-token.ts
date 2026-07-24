// Shared signed-token primitives (§8, §11). SERVER-ONLY — reads MAGIC_LINK_SECRET.
// Lives in lib/ (NOT app/) so both the customer surface (app/_lib/tokens.ts) and the email
// templates (lib/email) can mint the durable order-tracking link without lib importing from app.
//
// Token format is `base64url(JSON).signature` (HMAC-SHA256). The dot lets /track distinguish a
// durable order token (has a dot) from a single-use magic-login token (no dot, built in lib/auth).
import crypto from "node:crypto";

function secret(): string {
  const s = process.env.MAGIC_LINK_SECRET;
  if (!s) throw new Error("MAGIC_LINK_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Generic signed-payload encode/decode — used for order tokens here and session tokens in app. */
export function encode(obj: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decode(token: string): Record<string, unknown> | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig || !safeEqual(sign(payload), sig)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString()) as Record<string, unknown>;
    return typeof obj.exp === "number" && Date.now() <= obj.exp ? obj : null;
  } catch {
    return null;
  }
}

// Durable ORDER-TRACKING token: signs an order id, ~30-day TTL (§8). A bare order id can never
// expose an order — /track verifies this before showing anything, and the confirmation email
// links it for true one-click tracking (§11 tpl 1).
const ORDER_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function signOrderToken(orderId: string): string {
  return encode({ id: orderId, exp: Date.now() + ORDER_TOKEN_TTL_MS });
}

export function verifyOrderToken(token: string): string | null {
  const obj = decode(token);
  return obj && typeof obj.id === "string" ? obj.id : null;
}
