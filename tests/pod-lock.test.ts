import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { requestCancellation, CancellationWindowClosedError } from "@/lib/orders/cancellation";
import { prisma, resetDb, makeSku, makeOrderAt } from "./helpers";

describe("§13.6 POD cancellation lock", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("cancel request after PRINT_STARTED is rejected with a clear window-closed message", async () => {
    await makeSku({ stockQty: 0 }); // POD path
    const order = await makeOrderAt("PRINT_STARTED", {
      fulfilmentType: "POD",
      razorpayPaymentId: "pay_pod",
      printStartedAt: new Date(),
    });

    // The cancellation window is closed once printing begins (§6). A customer cancel is a request,
    // and the request itself is refused — with a plain, customer-facing message.
    const err = await requestCancellation(order.id, "changed mind", "CUSTOMER").catch((e) => e);
    expect(err).toBeInstanceOf(CancellationWindowClosedError);
    expect((err as CancellationWindowClosedError).customerMessage).toMatch(/printing|no longer be cancelled/i);

    // Nothing moved: still PRINT_STARTED, no cancellation recorded, no cancel event.
    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.status).toBe("PRINT_STARTED");
    expect(final.cancelRequestedAt).toBeNull();
    expect(final.cancelReason).toBeNull();

    const cancelEvents = await prisma.orderEvent.findMany({
      where: { orderId: order.id, metadata: { path: ["event"], equals: "CANCEL_REQUESTED" } },
    });
    expect(cancelEvents).toHaveLength(0);
  });
});
