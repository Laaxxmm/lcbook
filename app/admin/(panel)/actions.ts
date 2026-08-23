"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Prisma, Actor, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { transitionOrder } from "@/lib/orders/state-machine";
import { InvalidTransitionError } from "@/lib/orders/status";
import { initiateRefund, DoubleRefundError } from "@/lib/refunds";
import {
  approveCancellation,
  rejectCancellation as rejectCancellationRequest,
} from "@/lib/orders/cancellation";
import { updateSku } from "@/lib/sku";
import { runSheetSyncJob, drainSheetSyncJobs } from "@/lib/sheet-sync";
import { enqueueJob } from "@/lib/jobs";
import * as email from "@/lib/email";
import {
  sendPrintStartedEmail,
  sendDispatchedEmail,
  sendRefundInitiatedEmail,
} from "@/lib/notifications";
import { getAdminUser, ADMIN_COOKIE } from "@/app/admin/_lib/session";
import { sendAdminMail, para } from "@/app/admin/_lib/mail";
import type { ActionState } from "@/components/admin/types";

// ── All admin mutations (§14). EVERY action re-checks the admin session (a page guard does not
// protect a direct POST), then routes through the FROZEN, row-locked lib functions — never
// writing order/stock rows directly. Errors are returned as {error} for inline display. ──

async function guard(): Promise<ActionState | null> {
  const admin = await getAdminUser();
  return admin ? null : { error: "Your session expired. Sign in again." };
}

function fail(err: unknown): ActionState {
  if (err instanceof InvalidTransitionError) return { error: "That transition isn't legal from the current status." };
  if (err instanceof DoubleRefundError) return { error: "A refund already exists for this order." };
  const msg = err instanceof Error ? err.message : "Something went wrong.";
  console.error("[admin action]", err);
  return { error: msg };
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function intField(fd: FormData, key: string): number | null {
  const raw = str(fd, key);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

// Catalogue fields shared by create + edit (§14). Parses and validates in the same precedence
// both actions used before; returns {error} on the first bad field, else the persisted shape.
type CatalogueFields = { name: string; titles: string[]; bookCount: number; pricePaise: number; weightGrams: number };
function parseCatalogueFields(fd: FormData): CatalogueFields | { error: string } {
  const name = str(fd, "name");
  const titles = str(fd, "titles").split(",").map((t) => t.trim()).filter(Boolean);
  const bookCount = intField(fd, "bookCount");
  const priceRupees = Number(str(fd, "priceRupees"));
  const weightGrams = intField(fd, "weightGrams");
  if (!name) return { error: "Name is required." };
  if (bookCount === null || bookCount < 1) return { error: "Book count must be a whole number ≥ 1." };
  if (!Number.isFinite(priceRupees) || priceRupees <= 0) return { error: "Price must be a positive number." };
  if (weightGrams === null || weightGrams <= 0) return { error: "Weight (grams) must be a positive whole number." };
  return { name, titles, bookCount, pricePaise: Math.round(priceRupees * 100), weightGrams };
}

function revalidateOrder(orderId: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/print-queue");
  revalidatePath("/admin/cancellations");
  revalidatePath("/admin/flagged");
}

// ── Auth ────────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
  redirect("/admin/login");
}

// ── Order status advances (everything except SHIPPED + REFUND, which have dedicated flows) ──
export async function advanceOrder(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const orderId = str(fd, "orderId");
  const toStatus = str(fd, "toStatus") as OrderStatus;
  if (!orderId || !Object.values(OrderStatus).includes(toStatus)) return { error: "Bad request." };
  if (toStatus === OrderStatus.SHIPPED) return { error: "Use the dispatch form to ship (needs AWB + courier)." };
  if (toStatus === OrderStatus.REFUND_INITIATED) return { error: "Use the refund action to initiate a refund." };

  try {
    const order = await transitionOrder(orderId, toStatus, Actor.ADMIN);
    // Side-effect emails (§6, §11). PRINT_STARTED fires the cancellation-window-closed notice.
    if (toStatus === OrderStatus.PRINT_STARTED) await sendPrintStartedEmail(order);
    else if (toStatus === OrderStatus.DELIVERED)
      enqueueJob(`email:delivered:${order.id}`, () => email.sendDelivered(order));
    revalidateOrder(orderId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// Dismiss the amount-mismatch flag once an admin has reviewed it (§14). Audited via OrderEvent;
// does NOT change status or money — the admin still advances the order via the normal transitions.
export async function clearOrderFlags(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const orderId = str(fd, "orderId");
  if (!orderId) return { error: "Bad request." };

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order not found.");
      if (!order.amountMismatchFlagged) return;
      await tx.order.update({ where: { id: orderId }, data: { amountMismatchFlagged: false } });
      await tx.orderEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          actor: Actor.ADMIN,
          metadata: { kind: "FLAG_CLEARED", flag: "amountMismatch" } as Prisma.InputJsonValue,
        },
      });
    });
    revalidateOrder(orderId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Dispatch: AWB + courier → SHIPPED (§14). Locks cancellation at SHIPPED (§6). ──
export async function dispatchOrder(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const orderId = str(fd, "orderId");
  const awb = str(fd, "awb");
  const courier = str(fd, "courier");
  if (!orderId) return { error: "Bad request." };
  if (!awb || !courier) return { error: "Enter both the AWB number and the courier." };

  try {
    const order = await transitionOrder(orderId, OrderStatus.SHIPPED, Actor.ADMIN, { awb, courier });
    await sendDispatchedEmail(order);
    revalidateOrder(orderId);
    return { ok: true, msg: "Dispatched — customer notified." };
  } catch (err) {
    return fail(err);
  }
}

// ── Refund an ALREADY-cancelled order (order-detail "Initiate refund" button, for an admin-direct
// CANCELLED_BY_ADMIN). Double-refund-guarded in lib/refunds. The cancellation INBOX uses the
// approve action below, not this. ──
export async function refundOrder(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const orderId = str(fd, "orderId");
  const reason = str(fd, "reason") || undefined;
  if (!orderId) return { error: "Bad request." };

  try {
    const order = await initiateRefund(orderId, Actor.ADMIN, reason);
    await sendRefundInitiatedEmail(order);
    revalidateOrder(orderId);
    return { ok: true, msg: "Refund initiated — customer notified." };
  } catch (err) {
    return fail(err);
  }
}

// ── Cancellation inbox: APPROVE a pending customer request (§6/§14) → transition to
// CANCELLED_BY_USER + initiate the guarded refund, in the shared row-locked lib. Fails cleanly if
// the order has since shipped/started printing (nothing is refunded on a shipped order). ──
export async function approveCancellationRequest(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const orderId = str(fd, "orderId");
  if (!orderId) return { error: "Bad request." };

  try {
    const order = await approveCancellation(orderId, Actor.ADMIN, "cancellation request approved");
    await sendRefundInitiatedEmail(order);
    revalidateOrder(orderId);
    return { ok: true, msg: "Approved — refund initiated, customer notified." };
  } catch (err) {
    return fail(err);
  }
}

// ── Cancellation inbox: REJECT a pending customer request (§6/§14) → mark it reviewed (order stays
// in fulfilment) via the shared lib, then notify the customer. ──
export async function rejectCancellation(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const orderId = str(fd, "orderId");
  const note = str(fd, "note");
  if (!orderId) return { error: "Bad request." };

  try {
    const order = await rejectCancellationRequest(orderId, note || undefined, Actor.ADMIN);
    await sendAdminMail(
      order.customerEmail,
      `About your cancellation request — ${order.id}`,
      "Cancellation update",
      para(`Hi ${order.customerName}, we've reviewed your cancellation request for order <strong>${order.id}</strong> (${order.snapshotName}).`) +
        para(`We're unable to approve this cancellation${note ? `: ${note}` : "."}. If you have questions, just reply to this email.`),
    );
    revalidateOrder(orderId);
    return { ok: true, msg: "Customer notified of the decline." };
  } catch (err) {
    return fail(err);
  }
}

// ── SKU CRUD (§14). Create is a brand-new catalogue row (no lib helper exists for it and it
// has no orders/reservations to race); every EDIT/stock/deactivate goes through lib/sku so a
// SkuAudit row is written and nothing is ever hard-deleted. ──
export async function createSku(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const code = str(fd, "code").toUpperCase();
  const stockQty = intField(fd, "stockQty") ?? 0;

  if (!/^[A-Z0-9_]+$/.test(code)) return { error: "Code must be A–Z, 0–9 and underscores only." };
  const fields = parseCatalogueFields(fd);
  if ("error" in fields) return fields;
  if (stockQty < 0) return { error: "Stock can't be negative." };

  try {
    await prisma.sku.create({
      data: { code, ...fields, stockQty },
    });
    revalidatePath("/admin/skus");
    revalidatePath("/admin");
    return { ok: true, msg: `Created ${code}.` };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return { error: "A SKU with that code already exists." };
    return fail(err);
  }
}

export async function editSku(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const code = str(fd, "code");
  // Outbound e-learning links (§3): optional, empty clears (falls back to config default);
  // if present must be an http(s) URL — never persist a dead link.
  const ebookUrl = str(fd, "ebookUrl");
  const courseUrl = str(fd, "courseUrl");
  const mockUrl = str(fd, "mockUrl");
  const badUrl = (u: string) => u !== "" && !/^https?:\/\/\S+$/i.test(u);
  // DISPLAY-only digital prices (§3/§4): optional rupees → integer paise; empty clears (falls back
  // to the DIGITAL default). Non-negative (0 is valid — CAT/CLAT course). Returns false if invalid.
  const toPaiseOrNull = (raw: string): number | null | false => {
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : false;
  };
  const ebookPricePaise = toPaiseOrNull(str(fd, "ebookPriceRupees"));
  const coursePricePaise = toPaiseOrNull(str(fd, "coursePriceRupees"));
  const mockPricePaise = toPaiseOrNull(str(fd, "mockPriceRupees"));
  if (!code) return { error: "Bad request." };
  const fields = parseCatalogueFields(fd);
  if ("error" in fields) return fields;
  if (badUrl(ebookUrl)) return { error: "eBook URL must start with http:// or https://" };
  if (badUrl(courseUrl)) return { error: "Course URL must start with http:// or https://" };
  if (badUrl(mockUrl)) return { error: "Mock URL must start with http:// or https://" };
  if (ebookPricePaise === false) return { error: "eBook price must be a non-negative number." };
  if (coursePricePaise === false) return { error: "Course price must be a non-negative number." };
  if (mockPricePaise === false) return { error: "Mock price must be a non-negative number." };

  try {
    await updateSku(code, {
      ...fields,
      ebookUrl: ebookUrl || null,
      courseUrl: courseUrl || null,
      mockUrl: mockUrl || null,
      ebookPricePaise,
      coursePricePaise,
      mockPricePaise,
    });
    revalidatePath("/admin/skus");
    revalidatePath(`/admin/skus/${code}`);
    return { ok: true, msg: "Saved. Past orders keep their frozen snapshot." };
  } catch (err) {
    return fail(err);
  }
}

export async function adjustStock(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const code = str(fd, "code");
  const stockQty = intField(fd, "stockQty");
  if (!code) return { error: "Bad request." };
  if (stockQty === null || stockQty < 0) return { error: "Stock must be a whole number ≥ 0." };

  try {
    await updateSku(code, { stockQty });
    revalidatePath("/admin/skus");
    revalidatePath(`/admin/skus/${code}`);
    return { ok: true, msg: `Stock set to ${stockQty}.` };
  } catch (err) {
    return fail(err);
  }
}

export async function setSkuActive(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;

  const code = str(fd, "code");
  const active = str(fd, "active") === "true";
  if (!code) return { error: "Bad request." };

  try {
    await updateSku(code, { active });
    revalidatePath("/admin/skus");
    revalidatePath(`/admin/skus/${code}`);
    return { ok: true, msg: active ? "Reactivated." : "Deactivated (never deleted)." };
  } catch (err) {
    return fail(err);
  }
}

// ── Sheet sync (§10/§14): manual retry of one job, or drain the whole backlog. ──
export async function retrySheetJob(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;
  const jobId = str(fd, "jobId");
  if (!jobId) return { error: "Bad request." };
  try {
    const ok = await runSheetSyncJob(jobId);
    revalidatePath("/admin/sheet-sync");
    revalidatePath("/admin");
    return ok ? { ok: true, msg: "Synced." } : { error: "Still failing — see the last error." };
  } catch (err) {
    return fail(err);
  }
}

export async function drainSheetJobs(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  const g = await guard();
  if (g) return g;
  try {
    const { ran, synced } = await drainSheetSyncJobs();
    revalidatePath("/admin/sheet-sync");
    revalidatePath("/admin");
    return { ok: true, msg: `Ran ${ran}, synced ${synced}.` };
  } catch (err) {
    return fail(err);
  }
}
