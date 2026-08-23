import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { handleRazorpayWebhook } from "@/lib/webhook";
import { GATEWAY_FEE_RATE } from "@/lib/money";
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

    // Captured amount is well beyond the order + gateway-fee band → real tampering.
    const body = paymentCapturedBody({
      paymentId: "pay_tamper",
      razorpayOrderId: "order_tamper_1",
      amountPaise: order.amountPaise * 2,
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

  it("captured = order + gateway fee (customer bears the fee) → auto-confirms, not flagged", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("PAYMENT_PENDING", { razorpayOrderId: "order_fee_ok" });

    // Razorpay Fee Bearer = Customer: captured amount = order + its fee.
    const fee = Math.ceil(order.amountPaise * GATEWAY_FEE_RATE);
    const body = paymentCapturedBody({
      paymentId: "pay_fee_ok",
      razorpayOrderId: "order_fee_ok",
      amountPaise: order.amountPaise + fee,
    });
    const res = await handleRazorpayWebhook(body, signWebhook(body), "evt_fee_ok");
    expect(res).toEqual({ status: 200, note: "confirmed" });

    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.amountMismatchFlagged).toBe(false);
    expect(final.status).toBe("CONFIRMED");
    expect(final.invoiceNumber).not.toBeNull();
  });
});
