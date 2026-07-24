import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import * as notifications from "@/lib/notifications";
import { handleRazorpayWebhook } from "@/lib/webhook";
import {
  prisma,
  resetDb,
  makeSku,
  makeOrderAt,
  signWebhook,
  paymentCapturedBody,
} from "./helpers";

// Count the payment-confirmed email exactly once (side-effects enqueued once).
vi.mock("@/lib/notifications", () => ({
  sendPaymentConfirmedEmail: vi.fn(async () => {}),
  sendPrintStartedEmail: vi.fn(async () => {}),
  sendDispatchedEmail: vi.fn(async () => {}),
  sendRefundInitiatedEmail: vi.fn(async () => {}),
}));

describe("§13.1 duplicate webhook", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("same payment.captured ×3 → one PAID, one invoice, side-effects once", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("PAYMENT_PENDING", { razorpayOrderId: "order_rzp_1" });

    const body = paymentCapturedBody({
      paymentId: "pay_1",
      razorpayOrderId: "order_rzp_1",
      amountPaise: order.amountPaise,
    });
    const sig = signWebhook(body);
    const eventId = "evt_dup_1"; // same id on all three deliveries (Razorpay retry)

    const results = [
      await handleRazorpayWebhook(body, sig, eventId),
      await handleRazorpayWebhook(body, sig, eventId),
      await handleRazorpayWebhook(body, sig, eventId),
    ];

    expect(results[0]).toEqual({ status: 200, note: "confirmed" });
    expect(results[1]?.note).toMatch(/duplicate/);
    expect(results[2]?.note).toMatch(/duplicate/);

    // Exactly one WebhookEvent recorded.
    expect(await prisma.webhookEvent.count()).toBe(1);

    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.status).toBe("CONFIRMED");
    expect(final.invoiceNumber).toMatch(/^LC\/\d{4}-\d{2}\/0001$/);

    // One invoice number allocated.
    const counters = await prisma.invoiceCounter.findMany();
    expect(counters).toHaveLength(1);
    expect(counters[0]?.lastNumber).toBe(1);

    // Sheet sync enqueued exactly once for this order.
    expect(await prisma.sheetSyncJob.count({ where: { orderId: order.id } })).toBe(1);

    // Payment-confirmed email sent exactly once.
    expect(notifications.sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1);
  });
});
