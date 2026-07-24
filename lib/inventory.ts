import type { Order, Prisma } from "@prisma/client";
import { FulfilmentType } from "@prisma/client";

export const RESERVE_TTL_MS = 15 * 60 * 1000; // 15-minute soft reserve (§7)

/**
 * Decide fulfilment at CONFIRMED (§7), inside the caller's locked txn.
 * Locks the Sku row FOR UPDATE so concurrent confirmations serialise on stock.
 *   stockQty covers the order → decrement, IN_STOCK
 *   otherwise               → no stock change, increment printQueueCount, POD
 * Stock never goes negative — also enforced by a DB CHECK constraint, not app logic.
 */
export async function applyInventoryAtConfirm(
  tx: Prisma.TransactionClient,
  order: Order,
): Promise<FulfilmentType> {
  await tx.$queryRaw`SELECT code FROM "Sku" WHERE code = ${order.skuCode} FOR UPDATE`;
  const sku = await tx.sku.findUnique({ where: { code: order.skuCode } });
  if (!sku) throw new Error(`sku not found: ${order.skuCode}`);

  if (sku.stockQty > 0 && sku.stockQty >= order.qty) {
    await tx.sku.update({
      where: { code: sku.code },
      data: { stockQty: { decrement: order.qty } },
    });
    return FulfilmentType.IN_STOCK;
  }

  await tx.sku.update({
    where: { code: sku.code },
    data: { printQueueCount: { increment: order.qty } },
  });
  return FulfilmentType.POD;
}

export function reserveExpiry(now = new Date()): Date {
  return new Date(now.getTime() + RESERVE_TTL_MS);
}

/**
 * Sets available for a SKU right now = stock minus live soft reserves (§7).
 * ponytail: reserves modelled as PAYMENT_PENDING orders with a live reservedUntil,
 * not a separate table — upgrade to a Reservation model only if reserve volume
 * outgrows the orders table scan.
 */
export async function availableStock(
  db: Prisma.TransactionClient,
  skuCode: string,
  now = new Date(),
): Promise<number> {
  const sku = await db.sku.findUnique({ where: { code: skuCode } });
  if (!sku) return 0;
  const reserved = await db.order.count({
    where: { skuCode, status: "PAYMENT_PENDING", reservedUntil: { gt: now } },
  });
  return Math.max(0, sku.stockQty - reserved);
}
