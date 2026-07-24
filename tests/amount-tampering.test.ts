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

describe("§13.9 amount tampering", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("webhook amount ≠ stored amount → flagged for admin, NOT confirmed", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("PAYMENT_PENDING", { razorpayOrderId: "order_tamper_1" });

    // Captured amount does not match the stored order amount.
    const body = paymentCapturedBody({
      paymentId: "pay_tamper",
      razorpayOrderId: "order_tamper_1",
      amountPaise: order.amountPaise + 100,
    });
    const res = await handleRazorpayWebhook(body, signWebhook(body), "evt_tamper_1");
    expect(res).toEqual({ status: 200, note: "amount mismatch flagged" });

    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.amountMismatchFlagged).toBe(true);
    // Not auto-confirmed: still pending, no payment applied, no invoice allocated.
    expect(final.status).toBe("PAYMENT_PENDING");
    expect(final.razorpayPaymentId).toBeNull();
    expect(final.invoiceNumber).toBeNull();

    // No PAID/CONFIRMED transition was written.
    const advanced = await prisma.orderEvent.findMany({
      where: { orderId: order.id, toStatus: { in: ["PAID", "CONFIRMED"] } },
    });
    expect(advanced).toHaveLength(0);
  });
});
