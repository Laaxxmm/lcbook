import { NextResponse } from "next/server";
import { z } from "zod";
import { LoginTokenType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { issueMagicLink, issueOtp } from "@/lib/auth";
import { sendLoginToken } from "@/lib/email";

// Returning-customer entry (§8): magic link (primary) or 6-digit email OTP. No SMS, no
// passwords. We only ever email EXISTING users and always return the same generic 200 so a
// stranger cannot probe which emails have an account.
export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().email(),
  method: z.enum(["magic", "otp"]),
});

export async function POST(req: Request): Promise<Response> {
  let b;
  try {
    b = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: b.email } });
  if (user) {
    try {
      if (b.method === "otp") {
        const code = await issueOtp(user.id);
        await sendLoginToken(user, code, LoginTokenType.OTP);
      } else {
        const token = await issueMagicLink(user.id);
        await sendLoginToken(user, token, LoginTokenType.MAGIC_LINK);
      }
    } catch (err) {
      console.error("[auth/request] send failed:", err);
      // Still return generic 200 — don't leak account existence via error timing.
    }
  }
  return NextResponse.json({ ok: true });
}
