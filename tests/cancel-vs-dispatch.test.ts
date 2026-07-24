import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import * as razorpay from "@/lib/razorpay";
import { transitionOrder } from "@/lib/orders/state-machine";
import { requestCancellation, approveCancellation, CancellationWindowClosedError } from "@/lib/orders/cancellation";
import { prisma, resetDb, makeSku, makeOrderAt } from "./helpers";

// Mock only the HTTP refund call; the money-moving side of an approved cancellation is real.
vi.mock("@/lib/razorpay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/razorpay")>();
  return { ...actual, createRefund: vi.fn(async () => ({ id: "rfnd_race_1" })) };
});

describe("§13.3 cancel-vs-dispatch race", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // The money-moving race (§6): an admin APPROVING a cancellation (which refunds) at the same
  // instant AWB is entered (which ships). Exactly one wins on the row lock — a shipped order is
  // never refunded, a refunded order is never shipped.
  it("simultaneous approve-cancel + admin AWB → exactly one wins, no refund on a shipped order", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("PACKED", {
      fulfilmentType: "IN_STOCK",
      razorpayPaymentId: "pay_race",
      // a pending customer request is already on the order
      cancelRequestedAt: new Date(),
      cancelReason: "changed mind",
    });

    const [ship, approve] = await Promise.allSettled([
      transitionOrder(order.id, "SHIPPED", "ADMIN", { awb: "AWB123", courier: "BlueDart" }),
      approveCancellation(order.id, "ADMIN"),
    ]);

    // Deterministic mutual exclusion: exactly one side commits.
    const fulfilled = [ship, approve].filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);
    expect([ship, approve].filter((r) => r.status === "rejected")).toHaveLength(1);

    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    if (final.status === "SHIPPED") {
      // Dispatch won — the cancellation never moved money.
      expect(final.awb).toBe("AWB123");
      expect(final.refundId).toBeNull();
      expect(final.refundStatus).toBeNull();
      expect(razorpay.createRefund).not.toHaveBeenCalled();
      const cancelEvents = await prisma.orderEvent.findMany({
        where: { orderId: order.id, toStatus: "CANCELLED_BY_USER" },
      });
      expect(cancelEvents).toHaveLength(0);
    } else {
      // Approval won — cancelled + refund initiated, and the AWB never applied.
      expect(final.status).toBe("REFUND_INITIATED");
      expect(final.awb).toBeNull();
      expect(final.refundId).toBe("rfnd_race_1");
      expect(razorpay.createRefund).toHaveBeenCalledTimes(1);
    }
  });

  // A customer cancellation is a REQUEST, not a status change (§6): it never blocks dispatch and
  // never moves money. Recording a request and then shipping both succeed; no refund is attached.
  it("a customer cancel REQUEST never auto-refunds and never blocks a later dispatch", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("PACKED", { fulfilmentType: "IN_STOCK", razorpayPaymentId: "pay_req" });

    const requested = await requestCancellation(order.id, "changed mind", "CUSTOMER");
    expect(requested.status).toBe("PACKED"); // no status change
    expect(requested.cancelRequestedAt).not.toBeNull();
    expect(requested.refundId).toBeNull(); // never auto-refunds
    expect(razorpay.createRefund).not.toHaveBeenCalled();

    // Admin can still ship while the request is pending review.
    const shipped = await transitionOrder(order.id, "SHIPPED", "ADMIN", { awb: "AWB999", courier: "DTDC" });
    expect(shipped.status).toBe("SHIPPED");
    expect(shipped.refundId).toBeNull();

    // Once shipped, a fresh cancel request is refused — the window has closed.
    await expect(requestCancellation(order.id, "too late", "CUSTOMER")).rejects.toBeInstanceOf(
      CancellationWindowClosedError,
    );
  });
});
