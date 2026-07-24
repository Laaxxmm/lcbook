import type { Order } from "@prisma/client";
import { Actor, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SkuCode } from "@/lib/catalogue";
import { financialYearFor } from "@/lib/invoice";

export interface CreateOrderInput {
  skuCode: SkuCode;
  qty?: number;
  customer: { name: string; email: string; phone: string };
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  // Marketing consent — default UNTICKED, never pre-ticked (DPDP Act, §8).
  marketingConsent?: boolean;
  consentIp?: string;
  consentTextVersion?: string;
}

// Human order id: LC-2627-000431. The FY digits (2627) come from the FY prefix,
// the 6-digit sequence from a Postgres sequence (unique under concurrency).
function orderId(financialYear: string, seq: number): string {
  const prefix = `${financialYear.slice(2, 4)}${financialYear.slice(5, 7)}`;
  return `LC-${prefix}-${String(seq).padStart(6, "0")}`;
}

/**
 * Create a local Order in CREATED (spec §9 step 1). Freezes the SKU snapshot so
 * invoices always describe what was actually sold, even after the catalogue changes.
 */
export async function createLocalOrder(input: CreateOrderInput): Promise<Order> {
  const qty = input.qty ?? 1;
  if (qty < 1) throw new Error("qty must be >= 1");

  const sku = await prisma.sku.findUnique({ where: { code: input.skuCode } });
  if (!sku || !sku.active) throw new Error(`sku unavailable: ${input.skuCode}`);

  const now = new Date();
  const fy = financialYearFor(now);
  const rows = await prisma.$queryRaw<{ seq: number }[]>`
    SELECT nextval('order_number_seq')::int AS seq`;
  const seq = rows[0]?.seq;
  if (seq === undefined) throw new Error("failed to allocate order sequence");
  const id = orderId(fy, seq);

  const order = await prisma.order.create({
    data: {
      id,
      seq,
      status: OrderStatus.CREATED,
      skuCode: sku.code,
      qty,
      amountPaise: sku.pricePaise * qty,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      customerPhone: input.customer.phone,
      addrLine1: input.address.line1,
      addrLine2: input.address.line2 ?? null,
      city: input.address.city,
      state: input.address.state,
      pincode: input.address.pincode,
      marketingConsent: input.marketingConsent ?? false,
      consentAt: input.marketingConsent ? now : null,
      consentIp: input.marketingConsent ? (input.consentIp ?? null) : null,
      consentTextVersion: input.marketingConsent ? (input.consentTextVersion ?? null) : null,
      // Frozen SKU snapshot (§5).
      snapshotName: sku.name,
      snapshotTitles: sku.titles,
      snapshotPricePaise: sku.pricePaise,
      snapshotBookCount: sku.bookCount,
      snapshotWeightGrams: sku.weightGrams,
    },
  });

  await prisma.orderEvent.create({
    data: { orderId: id, fromStatus: null, toStatus: OrderStatus.CREATED, actor: Actor.SYSTEM },
  });

  return order;
}
