import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE_S, signSession } from "@/app/_lib/tokens";

// Verify a 6-digit email OTP (§8). On success set a signed, http-only session cookie so the
// customer stays logged in for /track and REQUIRE_LOGIN_AT_CHECKOUT. Single-use is enforced
// atomically inside lib/auth.verifyOtp. (Magic links are verified on the /track GET instead.)
export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/),
  next: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  let b;
  try {
    b = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Enter the 6-digit code." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: b.email } });
  const ok = user ? await verifyOtp(user.id, b.code) : false;
  if (!ok || !user) {
    return NextResponse.json({ ok: false, error: "That code is invalid or expired." }, { status: 401 });
  }

  // Only allow same-origin relative redirects (open-redirect guard).
  const next = b.next && b.next.startsWith("/") && !b.next.startsWith("//") ? b.next : "/track";
  const res = NextResponse.json({ ok: true, url: next });
  res.cookies.set(SESSION_COOKIE, signSession(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  return res;
}
