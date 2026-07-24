import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOrderToken } from "@/app/_lib/tokens";
import { requestCancellation, CancellationWindowClosedError } from "@/lib/orders/cancellation";
import { sendCancellationRequestedEmail } from "@/lib/notifications";

// Customer cancellation REQUEST (§6). Identity comes from the same durable, signed order token
// /track already verifies — a bare order id can never cancel an order. This records the request
// only (no status change, no refund) and, if the window has closed, returns the clear §6 message.
export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(req: Request): Promise<Response> {
  let b;
  try {
    b = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Missing cancellation details." }, { status: 400 });
  }

  const orderId = verifyOrderToken(b.token);
  if (!orderId) {
    return NextResponse.json({ error: "That link is invalid or has expired." }, { status: 401 });
  }

  try {
    const order = await requestCancellation(orderId, b.reason, "CUSTOMER");
    await sendCancellationRequestedEmail(order);
    return NextResponse.json({
      ok: true,
      message: "Cancellation requested. Our team will review it and email you.",
    });
  } catch (err) {
    if (err instanceof CancellationWindowClosedError) {
      return NextResponse.json({ error: err.customerMessage }, { status: 409 });
    }
    console.error("[cancel]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
