import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { transitionOrder } from "@/lib/orders/state-machine";
import { prisma, resetDb, makeSku, makeOrderAt } from "./helpers";

describe("§13.3 cancel-vs-dispatch race", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("concurrent customer cancel + admin AWB → exactly one wins, no refund on a shipped order", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("PACKED", {
      fulfilmentType: "IN_STOCK",
      razorpayPaymentId: "pay_race",
    });

    // Real concurrent transactions — both contend on the same FOR UPDATE row lock.
    const [ship, cancel] = await Promise.allSettled([
      transitionOrder(order.id, "SHIPPED", "ADMIN", { awb: "AWB123", courier: "BlueDart" }),
      transitionOrder(order.id, "CANCELLED_BY_USER", "CUSTOMER", { reason: "changed mind" }),
    ]);

    // Exactly one succeeds, one is rejected — deterministic mutual exclusion.
    const fulfilled = [ship, cancel].filter((r) => r.status === "fulfilled");
    const rejected = [ship, cancel].filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(["SHIPPED", "CANCELLED_BY_USER"]).toContain(final.status);

    // No refund ever attached during this race, whichever side won.
    expect(final.refundId).toBeNull();
    expect(final.refundStatus).toBeNull();

    if (final.status === "SHIPPED") {
      expect(final.awb).toBe("AWB123");
      expect(final.cancelRequestedAt).toBeNull(); // cancel never applied to a shipped order
    } else {
      expect(final.awb).toBeNull(); // AWB never applied to a cancelled order
    }

    // Only the winning transition wrote an event beyond the CREATED seed event.
    const events = await prisma.orderEvent.findMany({ where: { orderId: order.id } });
    const toShippedOrCancelled = events.filter(
      (e) => e.toStatus === "SHIPPED" || e.toStatus === "CANCELLED_BY_USER",
    );
    expect(toShippedOrCancelled).toHaveLength(1);
  });
});
