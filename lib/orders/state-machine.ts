import type { Order, Prisma } from "@prisma/client";
import { Actor, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ALLOWED_TRANSITIONS, InvalidTransitionError } from "@/lib/orders/status";
import { applyInventoryAtConfirm, reserveExpiry } from "@/lib/inventory";
import { allocateInvoiceNumber, financialYearFor } from "@/lib/invoice";
import { enqueueSheetSync } from "@/lib/sheet-sync";

export type TransitionMeta = Record<string, unknown>;

// Optional hook, run INSIDE the same locked txn, returning extra fields to persist.
// Used by refunds to guard + call the gateway atomically under the row lock.
export type TransitionHook = (
  tx: Prisma.TransactionClient,
  order: Order,
) => Promise<Prisma.OrderUpdateInput>;

function metaString(meta: TransitionMeta, key: string): string | undefined {
  const v = meta[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * The ONLY way an order changes status (spec §6).
 * Runs in a DB transaction, takes a `SELECT … FOR UPDATE` row lock on the order,
 * validates against the explicit allowed-transitions map, applies status-specific
 * side effects, and writes an append-only OrderEvent — all atomically.
 */
export async function transitionOrder(
  orderId: string,
  toStatus: OrderStatus,
  actor: Actor,
  meta: TransitionMeta = {},
  hook?: TransitionHook,
): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    // Row lock: application-level `if` checks are not sufficient — the
    // cancel-vs-dispatch race is real and it moves money.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error(`order not found: ${orderId}`);

    const from = order.status;
    if (!ALLOWED_TRANSITIONS[from].includes(toStatus)) {
      throw new InvalidTransitionError(orderId, from, toStatus);
    }

    const data: Prisma.OrderUpdateInput = { status: toStatus };

    switch (toStatus) {
      case OrderStatus.PAYMENT_PENDING:
        data.reservedUntil = reserveExpiry(); // soft reserve, 15-min TTL
        break;
      case OrderStatus.PAID: {
        const paymentId = metaString(meta, "paymentId");
        if (paymentId) data.razorpayPaymentId = paymentId;
        break;
      }
      case OrderStatus.PAYMENT_FAILED:
        data.reservedUntil = null; // release reserve
        break;
      case OrderStatus.CONFIRMED: {
        // Decrement-or-POD, invoice allocation and sheet enqueue all share this
        // one locked txn so a duplicate/concurrent confirm cannot double-count.
        const fulfilmentType = await applyInventoryAtConfirm(tx, order);
        const invoiceNumber = await allocateInvoiceNumber(tx, financialYearFor(order.createdAt));
        data.fulfilmentType = fulfilmentType;
        data.invoiceNumber = invoiceNumber;
        data.discountCode = `LC${order.seq}-COURSE`; // 10% off, redeemed on WiseApp (§11)
        await enqueueSheetSync(tx, order.id, "Orders", {
          order_id: order.id,
          status: OrderStatus.CONFIRMED,
          fulfilment_type: fulfilmentType,
          invoice_number: invoiceNumber,
        });
        break;
      }
      case OrderStatus.SHIPPED:
        data.awb = metaString(meta, "awb") ?? null;
        data.courier = metaString(meta, "courier") ?? null;
        data.dispatchedAt = new Date();
        break;
      case OrderStatus.DELIVERED:
        data.deliveredAt = new Date();
        break;
      case OrderStatus.PRINT_STARTED:
        data.printStartedAt = new Date(); // cancellation window now closed (email sent by caller)
        break;
      case OrderStatus.CANCELLED_BY_USER:
      case OrderStatus.CANCELLED_BY_ADMIN:
        data.cancelRequestedAt = new Date();
        data.cancelReason = metaString(meta, "reason") ?? null;
        break;
      case OrderStatus.REFUNDED:
        data.refundStatus = "PROCESSED";
        break;
      default:
        break;
    }

    if (hook) Object.assign(data, await hook(tx, order));

    const updated = await tx.order.update({ where: { id: orderId }, data });

    // Append-only event, same transaction (§5, §6).
    await tx.orderEvent.create({
      data: {
        orderId,
        fromStatus: from,
        toStatus,
        actor,
        metadata: meta as Prisma.InputJsonValue,
      },
    });

    return updated;
  });
}
