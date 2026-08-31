import { Prisma, Actor, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { transitionOrder } from "@/lib/orders/state-machine";
import { sendPaymentConfirmedEmail, sendRefundCompletedEmail } from "@/lib/notifications";
import { GATEWAY_FEE_RATE } from "@/lib/money";

export interface WebhookResult {
  status: number;
  note: string;
}

interface RzpEntity {
  id?: string;
  order_id?: string;
  payment_id?: string;
  amount?: number;
  notes?: { source?: string };
}
interface RzpPayload {
  event?: string;
  payload?: {
    payment?: { entity?: RzpEntity };
    refund?: { entity?: RzpEntity };
  };
}

function entityFor(event: string, payload: RzpPayload): RzpEntity | undefined {
  if (event.startsWith("refund.")) return payload.payload?.refund?.entity;
  return payload.payload?.payment?.entity;
}

/**
 * Razorpay webhook handler (spec §9). Authoritative order state comes from here,
 * not the client callback. Order of guards matters:
 *   1. signature (reject, write nothing)
 *   2. source filter (ignore foreign MID/account traffic, log nothing)
 *   3. idempotency (unique WebhookEvent per event id — Razorpay WILL retry)
 *   4. process, returning 200 fast
 *
 * @param eventId value of the X-Razorpay-Event-Id header (the idempotency key).
 */
export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string,
  eventId: string,
): Promise<WebhookResult> {
  // 1. Signature — reject on mismatch, nothing written.
  if (!verifyWebhookSignature(rawBody, signature)) {
    return { status: 400, note: "bad signature" };
  }

  let payload: RzpPayload;
  try {
    payload = JSON.parse(rawBody) as RzpPayload;
  } catch {
    return { status: 400, note: "invalid json" };
  }

  const event = payload.event ?? "";
  const entity = entityFor(event, payload);

  // 2. Source filter — ignore anything not tagged for publications.
  if (entity?.notes?.source !== "publications") {
    return { status: 200, note: "ignored: foreign source" };
  }
  if (!eventId) return { status: 400, note: "missing event id" };

  // 3. Idempotency — unique insert. On conflict: 200, no-op.
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: "razorpay",
        providerEventId: eventId,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { status: 200, note: "duplicate: already processed" };
    }
    throw e;
  }

  // 4. Process. On failure, remove the idempotency marker so a retry can reprocess.
  try {
    return await processEvent(event, entity);
  } catch (err) {
    await prisma.webhookEvent
      .delete({ where: { providerEventId: eventId } })
      .catch(() => undefined);
    throw err;
  }
}

async function processEvent(event: string, entity: RzpEntity): Promise<WebhookResult> {
  switch (event) {
    case "payment.captured": {
      const rzpOrderId = entity.order_id;
      if (!rzpOrderId) return { status: 200, note: "no order_id" };
      const order = await prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } });
      if (!order) return { status: 200, note: "unknown order" };

      // Reconcile amount. Fee Bearer = Customer: Razorpay adds its fee on top, so the captured
      // amount is the order amount PLUS up to the gateway fee. Accept [order, order + fee + ε];
      // underpayment or a larger overpayment is flagged as possible tampering — no auto-confirm.
      if (typeof entity.amount === "number") {
        const maxSurcharge = Math.ceil(order.amountPaise * GATEWAY_FEE_RATE) + 100; // +ε for rounding (paise)
        const surcharge = entity.amount - order.amountPaise;
        if (surcharge < 0 || surcharge > maxSurcharge) {
          await prisma.order.update({
            where: { id: order.id },
            data: { amountMismatchFlagged: true },
          });
          return { status: 200, note: "amount mismatch flagged" };
        }
      }

      await transitionOrder(order.id, OrderStatus.PAID, Actor.SYSTEM, {
        paymentId: entity.id,
        capturedPaise: entity.amount,
      });
      const confirmed = await transitionOrder(order.id, OrderStatus.CONFIRMED, Actor.SYSTEM);
      await sendPaymentConfirmedEmail(confirmed); // exactly once per event (idempotency-guarded)
      return { status: 200, note: "confirmed" };
    }

    case "payment.failed": {
      const rzpOrderId = entity.order_id;
      if (!rzpOrderId) return { status: 200, note: "no order_id" };
      const order = await prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } });
      if (order && order.status === OrderStatus.PAYMENT_PENDING) {
        await transitionOrder(order.id, OrderStatus.PAYMENT_FAILED, Actor.SYSTEM);
      }
      return { status: 200, note: "payment failed handled" };
    }

    case "refund.processed": {
      const refundId = entity.id;
      if (!refundId) return { status: 200, note: "no refund id" };
      const order = await prisma.order.findUnique({ where: { refundId } });
      if (order && order.status === OrderStatus.REFUND_INITIATED) {
        const refunded = await transitionOrder(order.id, OrderStatus.REFUNDED, Actor.SYSTEM);
        // Template 7 (§11). Without this the customer is never told the money actually landed.
        await sendRefundCompletedEmail(refunded);
      }
      return { status: 200, note: "refund processed" };
    }

    case "refund.failed": {
      const refundId = entity.id;
      if (refundId) {
        await prisma.order.updateMany({
          where: { refundId },
          data: { refundStatus: "FAILED" },
        });
      }
      return { status: 200, note: "refund failed flagged" };
    }

    default:
      return { status: 200, note: `unhandled event: ${event}` };
  }
}
