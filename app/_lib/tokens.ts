// Signed tokens for the customer surface (§8). SERVER-ONLY — reads MAGIC_LINK_SECRET.
// Two kinds, both `payload.signature` where payload is base64url(JSON):
//   - Durable ORDER-TRACKING token: signs an order id, ~30-day TTL. Used by /track so a
//     bare order id can never expose an order (IDOR guard). Verified before showing anything.
//   - SESSION token (cookie): signs a userId, 7-day TTL. Set after OTP/magic-link login and
//     checked by REQUIRE_LOGIN_AT_CHECKOUT.
// Magic-link *login* tokens (lib/auth) are a single base64url blob with NO dot — that lets
// /track tell a durable order token (has a dot) from a login token (no dot).
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

function encode(obj: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): Record<string, unknown> | null {
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

const ORDER_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days (§8 durable track link)
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE = "lc_session";
export const SESSION_MAX_AGE_S = SESSION_TTL_MS / 1000;

export function signOrderToken(orderId: string): string {
  return encode({ id: orderId, exp: Date.now() + ORDER_TOKEN_TTL_MS });
}

export function verifyOrderToken(token: string): string | null {
  const obj = decode(token);
  return obj && typeof obj.id === "string" ? obj.id : null;
}

export function signSession(userId: string): string {
  return encode({ uid: userId, exp: Date.now() + SESSION_TTL_MS });
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const obj = decode(token);
  return obj && typeof obj.uid === "string" ? obj.uid : null;
}
