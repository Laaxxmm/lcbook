import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPaymentSignature } from "@/lib/razorpay";

// Callback signature check (§9 step 5). This ONLY tells the UI whether to show success —
// the authoritative order state comes from the webhook (§9 step 6), never from here. So we
// verify the signature and return; we do not transition the order or touch any money.
export const runtime = "nodejs";

const Body = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  let b;
  try {
    b = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ok = verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
