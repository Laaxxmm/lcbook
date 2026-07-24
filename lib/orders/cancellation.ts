import type { Order, Prisma } from "@prisma/client";
import { Actor, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { transitionOrder } from "@/lib/orders/state-machine";
import { initiateRefund } from "@/lib/refunds";
import { isCancellable } from "@/lib/orders/status";

// Cancellation as a REQUEST, not an auto-transition (§6): "Customer cancellation creates a request
// for admin review. It never auto-refunds." The store and the admin panel both call these — one
// row-locked place that writes an append-only OrderEvent, so the request/approve/reject flow is
// atomic under the order lock (the cancel-vs-dispatch race moves money).

export class CancellationWindowClosedError extends Error {
  constructor(
    public readonly orderId: string,
    public readonly status: OrderStatus,
    public readonly customerMessage: string,
  ) {
    super(`cancellation window closed for ${orderId} (status ${status})`);
    this.name = "CancellationWindowClosedError";
  }
}

// Plain, customer-facing "window closed" copy (§6). POD closes at printing, IN_STOCK at dispatch.
export function windowClosedMessage(order: Pick<Order, "fulfilmentType">): string {
  return order.fulfilmentType === "POD"
    ? "Printing has already started, so this print-to-order set can no longer be cancelled."
    : "This order has already been dispatched, so it can no longer be cancelled.";
}

async function lockOrder(tx: Prisma.TransactionClient, orderId: string): Promise<Order> {
  // Row lock — the same guard transitionOrder uses; app-level `if` checks are not sufficient (§6).
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`order not found: ${orderId}`);
  return order;
}

/**
 * Customer (or admin-on-behalf) cancellation REQUEST. Records cancelRequestedAt + reason and
 * clears any prior review marker — NO status change, NO refund. Rejected if the cancellation
 * window has closed (§6). Writes an append-only OrderEvent (from == to == current status).
 */
export async function requestCancellation(
  orderId: string,
  reason: string | undefined,
  actor: Actor = Actor.CUSTOMER,
): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!isCancellable(order.status)) {
      throw new CancellationWindowClosedError(orderId, order.status, windowClosedMessage(order));
    }
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { cancelRequestedAt: new Date(), cancelReason: reason ?? null, cancelReviewedAt: null },
    });
    await tx.orderEvent.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status, // a request, not a transition (§6) — status is unchanged
        actor,
        metadata: { event: "CANCEL_REQUESTED", reason: reason ?? null } as Prisma.InputJsonValue,
      },
    });
    return updated;
  });
}

/**
 * Admin APPROVE of a pending request (§6/§14): transition into CANCELLED_BY_USER (row-locked,
 * writes the event, rejects if the order has since shipped/started printing), mark the request
 * reviewed, then initiate the guarded refund. If the transition is illegal the refund never runs.
 */
export async function approveCancellation(
  orderId: string,
  actor: Actor = Actor.ADMIN,
  reason?: string,
): Promise<Order> {
  await transitionOrder(orderId, OrderStatus.CANCELLED_BY_USER, actor, { reason, approvedRequest: true });
  await prisma.order.update({ where: { id: orderId }, data: { cancelReviewedAt: new Date() } });
  return initiateRefund(orderId, actor, reason);
}

/**
 * Admin REJECT of a pending request (§6/§14): mark it reviewed so it leaves the inbox, keep the
 * order in fulfilment (no status change), and record it in the append-only timeline. The caller
 * notifies the customer.
 */
export async function rejectCancellation(
  orderId: string,
  note: string | undefined,
  actor: Actor = Actor.ADMIN,
): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { cancelReviewedAt: new Date() }, // clears the pending request; order stays in fulfilment
    });
    await tx.orderEvent.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        actor,
        metadata: { event: "CANCEL_REJECTED", note: note ?? null } as Prisma.InputJsonValue,
      },
    });
    return updated;
  });
}
