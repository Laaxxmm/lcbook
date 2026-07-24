import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { computeRefund } from "@/lib/money";
import * as razorpay from "@/lib/razorpay";
import { initiateRefund } from "@/lib/refunds";
import { prisma, resetDb, makeSku, makeOrderAt } from "./helpers";

// Mock only the HTTP refund call; keep the real fee arithmetic under test.
vi.mock("@/lib/razorpay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/razorpay")>();
  return { ...actual, createRefund: vi.fn(async () => ({ id: "rfnd_arith_1" })) };
});

describe("§13.5 refund arithmetic", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("₹9,000 → retained ceil(900000 × rate), remainder refunded, exact paise", () => {
    // rate = 0.0236 (setup-env). ceil(900000 × 0.0236) = ceil(21240.0) = 21240.
    const r = computeRefund(900_000);
    expect(r.gatewayFeeRetainedPaise).toBe(21_240);
    expect(r.refundAmountPaise).toBe(878_760);
    // Integer partition invariant — nothing lost or invented.
    expect(r.gatewayFeeRetainedPaise + r.refundAmountPaise).toBe(900_000);
  });

  it("rounds the retained fee UP and never truncates (no float drift)", () => {
    // 899999 × 0.0236 = 21239.9764 → must ceil to 21240, not floor to 21239.
    const r = computeRefund(899_999);
    expect(r.gatewayFeeRetainedPaise).toBe(21_240);
    expect(r.refundAmountPaise).toBe(878_759);
    expect(r.gatewayFeeRetainedPaise + r.refundAmountPaise).toBe(899_999);
  });

  it("persists the exact paise on a ₹9,000 order through the refund path", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("CANCELLED_BY_USER", {
      razorpayPaymentId: "pay_arith",
      amountPaise: 900_000,
    });

    const refunded = await initiateRefund(order.id, "ADMIN");
    expect(refunded.gatewayFeeRetainedPaise).toBe(21_240);
    expect(refunded.refundAmountPaise).toBe(878_760);
    // Stored values partition the original amount exactly.
    expect(
      (refunded.gatewayFeeRetainedPaise ?? 0) + (refunded.refundAmountPaise ?? 0),
    ).toBe(order.amountPaise);
    expect(razorpay.createRefund).toHaveBeenCalledWith("pay_arith", 878_760);
  });
});
