import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { handleRazorpayWebhook } from "@/lib/webhook";
import { prisma, resetDb, makeSku, makeOrderAt, paymentCapturedBody } from "./helpers";

vi.mock("@/lib/notifications", () => ({
  sendPaymentConfirmedEmail: vi.fn(async () => {}),
  sendPrintStartedEmail: vi.fn(async () => {}),
  sendDispatchedEmail: vi.fn(async () => {}),
  sendRefundInitiatedEmail: vi.fn(async () => {}),
}));

describe("§13.10 bad signature", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("invalid X-Razorpay-Signature → rejected, nothing written", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("PAYMENT_PENDING", { razorpayOrderId: "order_badsig_1" });

    const body = paymentCapturedBody({
      paymentId: "pay_badsig",
      razorpayOrderId: "order_badsig_1",
      amountPaise: order.amountPaise,
    });
    // A signature that is not the real HMAC of the body.
    const res = await handleRazorpayWebhook(body, "deadbeefdeadbeef", "evt_badsig_1");
    expect(res).toEqual({ status: 400, note: "bad signature" });

    // Nothing persisted: no WebhookEvent recorded.
    expect(await prisma.webhookEvent.count()).toBe(0);

    // Order untouched.
    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.status).toBe("PAYMENT_PENDING");
    expect(final.amountMismatchFlagged).toBe(false);
    expect(final.razorpayPaymentId).toBeNull();
    expect(final.invoiceNumber).toBeNull();

    // Only the CREATED seed event exists — no state change written.
    const events = await prisma.orderEvent.findMany({ where: { orderId: order.id } });
    expect(events.map((e) => e.toStatus)).toEqual(["CREATED"]);
  });
});
