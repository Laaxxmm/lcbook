import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { handleRazorpayWebhook } from "@/lib/webhook";
import { runSheetSyncJob, drainSheetSyncJobs } from "@/lib/sheet-sync";
import {
  prisma,
  resetDb,
  makeSku,
  makeOrderAt,
  signWebhook,
  paymentCapturedBody,
} from "./helpers";

// Keep the confirm path off the real email network.
vi.mock("@/lib/notifications", () => ({
  sendPaymentConfirmedEmail: vi.fn(async () => {}),
  sendPrintStartedEmail: vi.fn(async () => {}),
  sendDispatchedEmail: vi.fn(async () => {}),
  sendRefundInitiatedEmail: vi.fn(async () => {}),
}));

// Point sheet sync at a dead endpoint (connection refused, fails fast).
const DEAD_URL = "http://127.0.0.1:1/dead";

describe("§13.8 sheet-sync failure", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.SHEETS_WEBHOOK_URL = DEAD_URL;
  });
  afterAll(async () => {
    delete process.env.SHEETS_WEBHOOK_URL;
    await prisma.$disconnect();
  });

  it("dead SHEETS_WEBHOOK_URL → order still completes, job queued, retried, failure visible", async () => {
    await makeSku({ stockQty: 100 });
    const order = await makeOrderAt("PAYMENT_PENDING", { razorpayOrderId: "order_sheet_1" });

    const body = paymentCapturedBody({
      paymentId: "pay_sheet",
      razorpayOrderId: "order_sheet_1",
      amountPaise: order.amountPaise,
    });
    const res = await handleRazorpayWebhook(body, signWebhook(body), "evt_sheet_1");
    expect(res).toEqual({ status: 200, note: "confirmed" });

    // The order completes regardless of the sheet being down (sync is out-of-band).
    const confirmed = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.invoiceNumber).not.toBeNull();

    // A durable job was enqueued inside the confirm txn, not yet synced.
    const job = await prisma.sheetSyncJob.findFirstOrThrow({ where: { orderId: order.id } });
    expect(job.syncedAt).toBeNull();
    expect(job.attempts).toBe(0);

    // Worker runs → POST fails → failure recorded (attempts + lastError set).
    expect(await runSheetSyncJob(job.id)).toBe(false);
    const after1 = await prisma.sheetSyncJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(after1.attempts).toBe(1);
    expect(after1.lastError).toBeTruthy();
    expect(after1.syncedAt).toBeNull();

    // Retried by the admin/cron backstop → still failing, attempt count climbs.
    await drainSheetSyncJobs();
    const after2 = await prisma.sheetSyncJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(after2.attempts).toBeGreaterThanOrEqual(2);
    expect(after2.lastError).toBeTruthy();
    expect(after2.syncedAt).toBeNull();
  });
});
