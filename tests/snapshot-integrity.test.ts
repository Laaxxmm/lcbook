import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { buildInvoiceData } from "@/lib/invoice";
import { updateSku } from "@/lib/sku";
import { prisma, resetDb, makeSku, makeOrder } from "./helpers";

describe("§13.12 snapshot integrity", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("editing SKU price and titles does not change a past order's invoice data", async () => {
    const originalTitles = ["Logical", "Quantitative", "English", "Legal"];
    await makeSku({ pricePaise: 900_000, bookCount: 13, titles: originalTitles });

    const order = await makeOrder(); // snapshot frozen at creation

    // Admin edits the catalogue freely (CLAT → 14 books / ₹9,500 / new titles).
    const newTitles = [...originalTitles, "Current Affairs"];
    await updateSku("CLAT", { pricePaise: 950_000, bookCount: 14, titles: newTitles });

    // Live SKU changed…
    const sku = await prisma.sku.findUniqueOrThrow({ where: { code: "CLAT" } });
    expect(sku.pricePaise).toBe(950_000);
    expect(sku.bookCount).toBe(14);
    expect(sku.titles).toEqual(newTitles);

    // …but the order's frozen snapshot did not.
    const frozen = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(frozen.snapshotPricePaise).toBe(900_000);
    expect(frozen.snapshotBookCount).toBe(13);
    expect(frozen.snapshotTitles).toEqual(originalTitles);

    // Invoice renders original values from the snapshot, never the live row.
    const invoice = buildInvoiceData(frozen);
    expect(invoice.lineItems[0]?.unitPricePaise).toBe(900_000);
    expect(invoice.lineItems[0]?.amountPaise).toBe(900_000);
    expect(invoice.lineItems[0]?.titles).toEqual(originalTitles);
    expect(invoice.lineItems[0]?.hsn).toBe("4901");
    expect(invoice.totalPaise).toBe(900_000);

    // The catalogue edit was audited (spec §14).
    const audits = await prisma.skuAudit.findMany({ where: { skuCode: "CLAT" } });
    expect(audits.map((a) => a.field).sort()).toEqual(["bookCount", "pricePaise", "titles"]);
  });
});
