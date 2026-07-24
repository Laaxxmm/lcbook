import type { Order } from "@prisma/client";
import { enqueueJob } from "@/lib/jobs";
import * as email from "@/lib/email";

// Notification ADAPTERS (spec §11). These are the single call sites the state machine /
// webhook / admin invoke exactly once. They delegate to lib/email (the real Resend send +
// templates) via the in-process job runner so the send + PDF render happen OFF the hot path:
// the webhook returns 200 fast and a failed email can never roll back a committed order (§9).
// Signatures are frozen — the webhook and tests depend on them.

export async function sendPaymentConfirmedEmail(order: Order): Promise<void> {
  enqueueJob(`email:confirm:${order.id}`, () => email.sendOrderConfirmation(order));
}

export async function sendPrintStartedEmail(order: Order): Promise<void> {
  enqueueJob(`email:print-started:${order.id}`, () => email.sendPrintStarted(order));
}

// §11 tpl 5 — cancellation requested, to the customer AND admin. Never auto-refunds (§6).
export async function sendCancellationRequestedEmail(order: Order): Promise<void> {
  enqueueJob(`email:cancel-requested:${order.id}`, () => email.sendCancellationRequested(order));
}

export async function sendDispatchedEmail(order: Order): Promise<void> {
  enqueueJob(`email:dispatched:${order.id}`, () => email.sendDispatched(order));
}

export async function sendRefundInitiatedEmail(order: Order): Promise<void> {
  enqueueJob(`email:refund-initiated:${order.id}`, () => email.sendRefundInitiated(order));
}
