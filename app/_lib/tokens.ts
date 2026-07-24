// Signed tokens for the customer surface (§8). SERVER-ONLY — the shared HMAC primitives live in
// lib/order-token.ts so lib/email can mint the same durable order-tracking link (lib must not
// import from app/). This module keeps only the app-specific SESSION cookie token.
//   - Durable ORDER-TRACKING token (re-exported): signs an order id, ~30-day TTL. Used by /track
//     so a bare order id can never expose an order (IDOR guard), and by the confirmation email.
//   - SESSION token (cookie): signs a userId, 7-day TTL. Set after OTP/magic-link login and
//     checked by REQUIRE_LOGIN_AT_CHECKOUT.
import { encode, decode, signOrderToken, verifyOrderToken } from "@/lib/order-token";

export { signOrderToken, verifyOrderToken };

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE = "lc_session";
export const SESSION_MAX_AGE_S = SESSION_TTL_MS / 1000;

export function signSession(userId: string): string {
  return encode({ uid: userId, exp: Date.now() + SESSION_TTL_MS });
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const obj = decode(token);
  return obj && typeof obj.uid === "string" ? obj.uid : null;
}
