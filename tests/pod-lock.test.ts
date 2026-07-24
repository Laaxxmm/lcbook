import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { transitionOrder } from "@/lib/orders/state-machine";
import { prisma, resetDb, makeSku, makeOrderAt } from "./helpers";

describe("§13.6 POD cancellation lock", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("cancel attempt after PRINT_STARTED is rejected as an illegal transition", async () => {
    await makeSku({ stockQty: 0 }); // POD path
    const order = await makeOrderAt("PRINT_STARTED", {
      fulfilmentType: "POD",
      razorpayPaymentId: "pay_pod",
      printStartedAt: new Date(),
    });

    // The cancellation window is closed once printing begins (§6).
    await expect(
      transitionOrder(order.id, "CANCELLED_BY_USER", "CUSTOMER", { reason: "changed mind" }),
    ).rejects.toThrow(/PRINT_STARTED.*CANCELLED_BY_USER|Illegal order transition/);

    // Nothing moved: still PRINT_STARTED, no cancellation recorded, no cancel event.
    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.status).toBe("PRINT_STARTED");
    expect(final.cancelRequestedAt).toBeNull();
    expect(final.cancelReason).toBeNull();

    const cancelEvents = await prisma.orderEvent.findMany({
      where: { orderId: order.id, toStatus: "CANCELLED_BY_USER" },
    });
    expect(cancelEvents).toHaveLength(0);
  });
});
