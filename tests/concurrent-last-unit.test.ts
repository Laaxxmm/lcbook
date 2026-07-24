import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { transitionOrder } from "@/lib/orders/state-machine";
import { prisma, resetDb, makeSku, makeOrderAt } from "./helpers";

describe("§13.2 concurrent last unit", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("two simultaneous confirms on the last unit → one IN_STOCK, one POD, stock never negative", async () => {
    // Exactly one unit of stock, two paid orders racing to confirm it.
    await makeSku({ stockQty: 1 });
    const a = await makeOrderAt("PAID", { razorpayPaymentId: "pay_a" });
    const b = await makeOrderAt("PAID", { razorpayPaymentId: "pay_b" });

    // Real concurrent transactions: both contend on the same Sku FOR UPDATE lock.
    const results = await Promise.allSettled([
      transitionOrder(a.id, "CONFIRMED", "SYSTEM"),
      transitionOrder(b.id, "CONFIRMED", "SYSTEM"),
    ]);
    // POD is a valid fallback, never a failure — both confirms succeed.
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const [fa, fb] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: a.id } }),
      prisma.order.findUniqueOrThrow({ where: { id: b.id } }),
    ]);
    const fulfilments = [fa.fulfilmentType, fb.fulfilmentType];
    expect(fulfilments.filter((f) => f === "IN_STOCK")).toHaveLength(1);
    expect(fulfilments.filter((f) => f === "POD")).toHaveLength(1);

    const sku = await prisma.sku.findUniqueOrThrow({ where: { code: "CLAT" } });
    expect(sku.stockQty).toBe(0); // decremented exactly once
    expect(sku.stockQty).toBeGreaterThanOrEqual(0); // invariant — never negative
    expect(sku.printQueueCount).toBe(1); // the POD order queued for print
  });
});
