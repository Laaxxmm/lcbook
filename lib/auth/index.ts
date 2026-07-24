// Passwordless auth (spec §8). Magic link (primary) + email OTP (6-digit code, not a
// link). No SMS, no passwords, no reset flow. Tokens are single-use, expire in 15
// minutes, and only their HASH is stored. SERVER-ONLY (reads MAGIC_LINK_SECRET, DB).
import crypto from "node:crypto";
import { LoginTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";

const TTL_MS = 15 * 60 * 1000; // 15-minute expiry (§8)

function secret(): string {
  const s = process.env.MAGIC_LINK_SECRET;
  if (!s) throw new Error("MAGIC_LINK_SECRET is not set");
  return s;
}

// Store the HMAC, never the raw token/code (§8).
function hashToken(raw: string): string {
  return crypto.createHmac("sha256", secret()).update(raw).digest("hex");
}

function expiry(): Date {
  return new Date(Date.now() + TTL_MS);
}

/** Issue a magic-link token for a user. Returns the RAW token — the caller builds the
 *  URL (`${APP_URL}/track?token=…`) and emails it; only the hash is persisted. */
export async function issueMagicLink(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.loginToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      type: LoginTokenType.MAGIC_LINK,
      expiresAt: expiry(),
    },
  });
  return token;
}

/** Verify + consume a magic link. Returns the userId on success, null if the token is
 *  unknown, expired, or already used. Single-use is enforced atomically. */
export async function verifyMagicLink(token: string): Promise<string | null> {
  return consume(hashToken(token), LoginTokenType.MAGIC_LINK);
}

/** Issue a 6-digit numeric OTP for a user. Returns the RAW code to email (§8). */
export async function issueOtp(userId: string): Promise<string> {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.loginToken.create({
    data: {
      userId,
      tokenHash: hashToken(code),
      type: LoginTokenType.OTP,
      expiresAt: expiry(),
    },
  });
  return code;
}

/** Verify + consume an OTP for a specific user. */
export async function verifyOtp(userId: string, code: string): Promise<boolean> {
  const uid = await consume(hashToken(code), LoginTokenType.OTP, userId);
  return uid !== null;
}

// Find the newest matching unused/unexpired token and claim it atomically. The
// guarded updateMany (usedAt: null) is the single-use guard: a concurrent second
// verify claims 0 rows and fails.
async function consume(
  tokenHash: string,
  type: LoginTokenType,
  userId?: string,
): Promise<string | null> {
  const now = new Date();
  const token = await prisma.loginToken.findFirst({
    where: {
      tokenHash,
      type,
      usedAt: null,
      expiresAt: { gt: now },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  if (!token) return null;

  const claimed = await prisma.loginToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: now },
  });
  return claimed.count === 1 ? token.userId : null;
}
