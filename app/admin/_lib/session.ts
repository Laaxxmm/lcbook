import type { User } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signSession, verifySession } from "@/app/_lib/tokens";

// Admin auth (spec §14): SINGLE admin, magic-link only, no roles. Only ADMIN_EMAIL may enter.
// We reuse the store's signed-cookie session (app/_lib/tokens: HMAC over {uid}), under a
// SEPARATE cookie name so a customer's lc_session never grants admin and vice-versa. The
// cookie signs the admin's User id; on read we still re-check the row's email === ADMIN_EMAIL,
// so a leaked/rotated ADMIN_EMAIL immediately revokes access. SERVER-ONLY.
export const ADMIN_COOKIE = "lc_admin";

function adminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "support@learncrew.org").trim().toLowerCase();
}

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === adminEmail();
}

/** The signed session value to store in the lc_admin cookie after a verified magic link. */
export function adminSessionValue(userId: string): string {
  return signSession(userId);
}

/**
 * Resolve the current admin from the request cookie, or null. Used by the panel layout
 * (redirects if null) and every mutation action (rejects if null). Verifies the HMAC AND
 * that the backing user is still ADMIN_EMAIL.
 */
export async function getAdminUser(): Promise<User | null> {
  const uid = verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!uid) return null;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  return user && isAdminEmail(user.email) ? user : null;
}
