import type { Order } from "@prisma/client";

// Transactional email (spec §11, Resend). Phase 1 CORE ships these as the single
// call sites the state machine / webhook invoke exactly once; the actual Resend
// send + React templates + Bill-of-Supply PDF attachment are the email/PDF task.
// Kept as thin async functions so callers await them and tests can assert call counts.

export async function sendPaymentConfirmedEmail(order: Order): Promise<void> {
  void order; // email #1: summary, BoS PDF, SLA, magic link, cancellation policy, upsell, discount code
}

export async function sendPrintStartedEmail(order: Order): Promise<void> {
  void order; // email #2 (POD): cancellation window closed
}

export async function sendDispatchedEmail(order: Order): Promise<void> {
  void order; // email #3: AWB, courier, tracking link
}

export async function sendRefundInitiatedEmail(order: Order): Promise<void> {
  void order; // email #6: amount, gateway charge retained, timeline
}
