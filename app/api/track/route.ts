import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signOrderToken } from "@/app/_lib/tokens";

// Order-id + phone lookup (§8). SECURITY: a bare order id must NEVER reveal an order (IDOR).
// We require the phone on the order to match; only then do we mint a signed durable token and
// redirect to /track?token=… so the result is shareable/refreshable without re-entering the
// phone, and still unforgeable. A wrong id and a wrong phone return the SAME generic error.
export const runtime = "nodejs";

const Body = z.object({
  orderId: z.string().trim().min(1).max(40),
  phone: z.string().trim().min(4).max(20),
});

// Compare on trailing digits so "+91 97382 55304" matches "9738255304".
function phoneMatches(stored: string, input: string): boolean {
  const norm = (s: string) => s.replace(/\D/g, "").slice(-10);
  const a = norm(stored);
  const b = norm(input);
  return a.length === 10 && a === b;
}

export async function POST(req: Request): Promise<Response> {
  let b;
  try {
    b = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Enter your order ID and phone number." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: b.orderId } });
  if (!order || !phoneMatches(order.customerPhone, b.phone)) {
    return NextResponse.json({ error: "No order found with that ID and phone number." }, { status: 404 });
  }

  const token = signOrderToken(order.id);
  return NextResponse.json({ ok: true, url: `/track?token=${encodeURIComponent(token)}` });
}
