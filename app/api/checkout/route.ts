import { NextResponse } from "next/server";
import { z } from "zod";
import { Actor, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SKU_CODES } from "@/lib/catalogue";
import { createLocalOrder } from "@/lib/orders/create";
import { createRazorpayOrder } from "@/lib/razorpay";
import { transitionOrder } from "@/lib/orders/state-machine";
import { CONSENT_TEXT_VERSION } from "@/app/_lib/consent";

// Server checkout flow (§9): create local Order (CREATED) → Razorpay Orders API
// (amount paise, receipt = local id, notes.source="publications") → PAYMENT_PENDING + soft
// reserve → return razorpay_order_id + key_id ONLY. key_secret never leaves the server.
export const runtime = "nodejs";

const digits = (label: string, len: number) =>
  z.string().trim().regex(new RegExp(`^\\d{${len}}$`), `${label} must be ${len} digits`);

const Body = z.object({
  skuCode: z.enum(SKU_CODES),
  qty: z.number().int().min(1).max(10).optional(),
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().regex(/^\d{10,15}$/, "phone must be 10–15 digits"),
  }),
  address: z.object({
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    pincode: digits("pincode", 6),
  }),
  marketingConsent: z.boolean().optional(),
});

function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

export async function POST(req: Request): Promise<Response> {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues.map((i) => i.message).join("; ") : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const order = await createLocalOrder({
      skuCode: parsed.skuCode,
      qty: parsed.qty,
      customer: parsed.customer,
      address: parsed.address,
      // Consent is only recorded when the (default-unticked) box is checked (§8 DPDP).
      marketingConsent: parsed.marketingConsent ?? false,
      consentIp: clientIp(req),
      consentTextVersion: CONSENT_TEXT_VERSION,
    });

    const rzp = await createRazorpayOrder({ amountPaise: order.amountPaise, receipt: order.id });
    await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzp.id } });
    // PAYMENT_PENDING places the 15-minute soft reserve (§7).
    await transitionOrder(order.id, OrderStatus.PAYMENT_PENDING, Actor.SYSTEM);

    // Auto-create the returning-customer User from the email — no password, ever (§8).
    // Enables magic-link / OTP login later; idempotent so a retry is harmless.
    await prisma.user.upsert({
      where: { email: parsed.customer.email },
      create: { email: parsed.customer.email, phone: parsed.customer.phone, name: parsed.customer.name },
      update: { phone: parsed.customer.phone, name: parsed.customer.name },
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: rzp.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // public Checkout key; secret stays server-side
      amountPaise: order.amountPaise,
    });
  } catch (err) {
    console.error("[checkout] failed:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
