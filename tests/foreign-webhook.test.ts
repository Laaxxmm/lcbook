import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { handleRazorpayWebhook } from "@/lib/webhook";
import {
  prisma,
  resetDb,
  makeSku,
  makeOrderAt,
  signWebhook,
  paymentCapturedBody,
} from "./helpers";

vi.mock("@/lib/notifications", () => ({
  sendPaymentConfirmedEmail: vi.fn(async () => {}),
  sendPrintStartedEmail: vi.fn(async () => {}),
  sendDispatchedEmail: vi.fn(async () => {}),
  sendRefundInitiatedEmail: vi.fn(async () => {}),
}));

describe("§13.11 foreign webhook", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("event with notes.source='coaching' → 200, ignored, no order touched", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("PAYMENT_PENDING", { razorpayOrderId: "order_foreign_1" });

    // Validly signed, but tagged for a different (coaching) MID/account.
    const body = paymentCapturedBody({
      paymentId: "pay_foreign",
      razorpayOrderId: "order_foreign_1",
      amountPaise: order.amountPaise,
      source: "coaching",
    });
    const res = await handleRazorpayWebhook(body, signWebhook(body), "evt_foreign_1");
    expect(res.status).toBe(200);
    expect(res.note).toMatch(/ignored|foreign/i);

    // Ignored before the idempotency insert — nothing recorded, log nothing (§9).
    expect(await prisma.webhookEvent.count()).toBe(0);

    // Order completely untouched.
    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.status).toBe("PAYMENT_PENDING");
    expect(final.amountMismatchFlagged).toBe(false);
    expect(final.razorpayPaymentId).toBeNull();
    expect(final.invoiceNumber).toBeNull();

    const events = await prisma.orderEvent.findMany({ where: { orderId: order.id } });
    expect(events.map((e) => e.toStatus)).toEqual(["CREATED"]);
  });
});
