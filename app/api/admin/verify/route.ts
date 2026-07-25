import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMagicLink } from "@/lib/auth";
import { SESSION_MAX_AGE_S } from "@/app/_lib/tokens";
import { ADMIN_COOKIE, adminSessionValue, isAdminEmail } from "@/app/admin/_lib/session";

// Admin magic-link landing (§14). Consumes the single-use token (lib/auth, atomic single-use),
// confirms the backing user is ADMIN_EMAIL, then sets the signed lc_admin cookie and redirects
// into the panel. Any failure → back to /admin/login with a generic error.
export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  // Redirect against the PUBLIC origin (APP_URL). Behind Railway's proxy `req.url` is the
  // internal host (localhost:8080), so redirecting to it sends the browser to a dead address.
  const base = process.env.APP_URL || new URL(req.url).origin;
  const token = new URL(req.url).searchParams.get("token");
  const fail = NextResponse.redirect(new URL("/admin/login?error=1", base));
  if (!token) return fail;

  const uid = await verifyMagicLink(token);
  if (!uid) return fail;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || !isAdminEmail(user.email)) return fail;

  const res = NextResponse.redirect(new URL("/admin", base));
  res.cookies.set(ADMIN_COOKIE, adminSessionValue(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  return res;
}
