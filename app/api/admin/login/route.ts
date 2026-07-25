import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { issueMagicLink } from "@/lib/auth";
import { isAdminEmail } from "@/app/admin/_lib/session";
import { sendAdminMail, para, linkButton } from "@/app/admin/_lib/mail";

// Admin sign-in request (§14): magic link ONLY, single admin, no roles. We email a signed,
// single-use, 15-minute link (reusing lib/auth's hashed-token store) ONLY when the address is
// exactly ADMIN_EMAIL — but always return a generic 200 so the endpoint can't be used to probe
// the admin address. The link lands on /api/admin/verify which sets the lc_admin cookie.
export const runtime = "nodejs";

const Body = z.object({ email: z.string().trim().email() });

export async function POST(req: Request): Promise<Response> {
  let b;
  try {
    b = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  if (isAdminEmail(b.email)) {
    try {
      // Ensure the admin has a User row (no password ever — §5/§8), then issue the link.
      const user = await prisma.user.upsert({
        where: { email: b.email.toLowerCase() },
        update: {},
        create: { email: b.email.toLowerCase(), name: "Admin" },
      });
      const token = await issueMagicLink(user.id);
      const url = `${process.env.APP_URL ?? ""}/api/admin/verify?token=${encodeURIComponent(token)}`;
      // Print the single-use sign-in link to the server log so it can be retrieved without
      // email: always in dev, and in production ONLY when ADMIN_LOGIN_DEBUG=true (a temporary
      // bootstrap before Resend is wired — turn it off once email works or after first login).
      if (process.env.NODE_ENV !== "production" || process.env.ADMIN_LOGIN_DEBUG === "true") {
        console.log(`\n[admin/login] sign-in link:\n${url}\n`);
      }
      await sendAdminMail(
        user.email,
        "Sign in to Learn Crew Publications admin",
        "Admin sign-in",
        para("Tap below to sign in to the admin panel. This link is single-use and expires in <strong>15 minutes</strong>.") +
          linkButton(url, "Sign in to admin") +
          para(`<span style="font-size:13px;color:#4A554E">If you didn't request this, ignore this email.</span>`),
      );
    } catch (err) {
      console.error("[admin/login] send failed:", err);
      // still return generic 200
    }
  }
  return NextResponse.json({ ok: true });
}
