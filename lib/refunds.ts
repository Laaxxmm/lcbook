import type { Order } from "@prisma/client";
import { Actor, OrderStatus } from "@prisma/client";
import { transitionOrder } from "@/lib/orders/state-machine";
import { computeRefund } from "@/lib/money";
import { createRefund } from "@/lib/razorpay";

export class DoubleRefundError extends Error {
  constructor(public readonly orderId: string) {
    super(`refund already exists for order ${orderId}`);
    this.name = "DoubleRefundError";
  }
}

/**
 * Initiate a refund on a cancelled order (spec §9). Runs inside the state-machine's
 * locked txn via the transition hook, so the double-refund guard, fee arithmetic and
 * the single gateway call are all atomic under the order row lock:
 *   refundAmount = amountPaise − ceil(amountPaise × GATEWAY_FEE_RATE)
 * REFUND_INITIATED → REFUNDED happens later, only on the refund.processed webhook.
 *
 * ponytail: the gateway call sits inside the DB txn (fine — fast, and it's what makes
 * "one call, second rejected" atomic). If gateway latency starts holding the row
 * lock too long, split into claim-txn → call → finalise-txn.
 */
export async function initiateRefund(
  orderId: string,
  actor: Actor = Actor.ADMIN,
  reason?: string,
): Promise<Order> {
  return transitionOrder(
    orderId,
    OrderStatus.REFUND_INITIATED,
    actor,
    { reason },
    async (_tx, order) => {
      if (order.refundId) throw new DoubleRefundError(orderId); // guard, inside the lock
      if (!order.razorpayPaymentId) {
        throw new Error(`cannot refund order ${orderId}: no captured payment`);
      }
      const { refundAmountPaise, gatewayFeeRetainedPaise } = computeRefund(order.amountPaise);
      const refund = await createRefund(order.razorpayPaymentId, refundAmountPaise);
      return {
        refundId: refund.id,
        refundAmountPaise,
        gatewayFeeRetainedPaise,
        refundStatus: "INITIATED",
      };
    },
  );
}
