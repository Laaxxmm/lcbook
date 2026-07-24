import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import * as razorpay from "@/lib/razorpay";
import { initiateRefund } from "@/lib/refunds";
import { prisma, resetDb, makeSku, makeOrderAt } from "./helpers";

// Mock only the HTTP refund call; keep real signature-verify etc.
vi.mock("@/lib/razorpay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/razorpay")>();
  return { ...actual, createRefund: vi.fn(async () => ({ id: "rfnd_test_1" })) };
});

describe("§13.4 double-refund guard", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("refund called twice → one gateway call, second rejected, exact paise retained", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("CANCELLED_BY_USER", {
      razorpayPaymentId: "pay_refund",
      amountPaise: 900_000,
    });

    // Fire two concurrent refunds against the row-locked order.
    const [a, b] = await Promise.allSettled([
      initiateRefund(order.id, "ADMIN"),
      initiateRefund(order.id, "ADMIN"),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
    const rejected = [a, b].filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Exactly one Razorpay refund call.
    expect(razorpay.createRefund).toHaveBeenCalledTimes(1);

    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.status).toBe("REFUND_INITIATED");
    expect(final.refundId).toBe("rfnd_test_1");
    expect(final.refundStatus).toBe("INITIATED");
    // ₹9,000: retained = ceil(900000 × 0.0236) = 21240, refund = 878760. Exact paise.
    expect(final.gatewayFeeRetainedPaise).toBe(21_240);
    expect(final.refundAmountPaise).toBe(878_760);

    // A subsequent refund attempt is refused too (refundId already set).
    await expect(initiateRefund(order.id, "ADMIN")).rejects.toThrow();
    expect(razorpay.createRefund).toHaveBeenCalledTimes(1);
  });
});
