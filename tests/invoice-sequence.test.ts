import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { transitionOrder } from "@/lib/orders/state-machine";
import { prisma, resetDb, makeSku, makeOrder } from "./helpers";

describe("§13.7 invoice sequence under concurrency", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("50 simultaneous PAID→CONFIRMED → 50 unique sequential numbers, no gaps/dupes", async () => {
    await makeSku({ stockQty: 100 });

    const ids: string[] = [];
    for (let i = 0; i < 50; i++) {
      const order = await makeOrder();
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID", razorpayPaymentId: `pay_${i}` },
      });
      ids.push(order.id);
    }

    // Real concurrency: 50 confirmations racing for invoice numbers at once.
    const results = await Promise.allSettled(
      ids.map((id) => transitionOrder(id, "CONFIRMED", "SYSTEM")),
    );
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const orders = await prisma.order.findMany({ where: { id: { in: ids } } });
    const numbers = orders.map((o) => o.invoiceNumber);
    expect(numbers.every((n) => n !== null)).toBe(true);

    // All formatted, all for the same FY.
    for (const n of numbers) expect(n).toMatch(/^LC\/\d{4}-\d{2}\/\d{4}$/);

    // Sequence 1..50 exactly — no gaps, no duplicates.
    const seqs = numbers.map((n) => Number(n!.split("/")[2])).sort((a, b) => a - b);
    expect(new Set(seqs).size).toBe(50);
    expect(seqs[0]).toBe(1);
    expect(seqs[49]).toBe(50);
    expect(seqs).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));

    const counter = await prisma.invoiceCounter.findMany();
    expect(counter).toHaveLength(1);
    expect(counter[0]?.lastNumber).toBe(50);
  });
});
