import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Google Sheet is a READ-ONLY mirror; Postgres is the source of truth (§10). We never read
// order state back from it — this module only ever POSTs. Sync is non-blocking and retried:
// enqueueSheetSync writes a durable SheetSyncJob row inside the caller's txn; a worker
// (runSheetSyncJob / drainSheetSyncJobs) POSTs to the Apps Script web app with exponential
// backoff, recording attempts + lastError so failures surface in admin (§10, §14).
export type SheetName = "Orders" | "Cancellations" | "PrintQueue";

const MAX_ATTEMPTS = 6;
const BASE_BACKOFF_MS = 2_000; // 2s, 4s, 8s … capped by MAX_ATTEMPTS

interface SheetPayload {
  sheet: SheetName;
  data: Record<string, unknown>;
}

/**
 * Durably enqueue a sheet upsert INSIDE the caller's transaction (§10). Returns once the row
 * is written; the actual POST happens later via the worker below so a dead Apps Script can
 * never block or roll back the order. Signature frozen — the state machine depends on it.
 */
export async function enqueueSheetSync(
  tx: Prisma.TransactionClient,
  orderId: string,
  sheet: SheetName,
  data: Record<string, unknown>,
): Promise<void> {
  await tx.sheetSyncJob.create({
    data: { orderId, payload: { sheet, data } as Prisma.InputJsonValue },
  });
}

// POST { secret, sheet, data } to the Apps Script web app. The script upserts by order_id.
// Throws on a non-2xx / network error so the caller can record it and retry.
async function postToSheet(payload: SheetPayload): Promise<void> {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) throw new Error("SHEETS_WEBHOOK_URL is not set");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: process.env.SHEETS_SECRET, sheet: payload.sheet, data: payload.data }),
  });
  if (!res.ok) throw new Error(`sheet sync HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

function readPayload(raw: Prisma.JsonValue): SheetPayload | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "sheet" in raw && "data" in raw) {
    const { sheet, data } = raw as Record<string, unknown>;
    if (typeof sheet === "string" && data && typeof data === "object") {
      return { sheet: sheet as SheetName, data: data as Record<string, unknown> };
    }
  }
  return null;
}

/**
 * Attempt one job once. On success stamps syncedAt; on failure records attempts + lastError
 * and, while under MAX_ATTEMPTS, schedules an in-process exponential-backoff retry.
 * ponytail: the setTimeout retry lives in-process and is lost on restart — drainSheetSyncJobs
 * (called from a cron / the admin "retry" action, §14) is the durable backstop that resumes it.
 */
export async function runSheetSyncJob(jobId: string): Promise<boolean> {
  const job = await prisma.sheetSyncJob.findUnique({ where: { id: jobId } });
  if (!job || job.syncedAt || job.attempts >= MAX_ATTEMPTS) return job?.syncedAt != null;

  const payload = readPayload(job.payload);
  if (!payload) {
    await prisma.sheetSyncJob.update({ where: { id: jobId }, data: { attempts: MAX_ATTEMPTS, lastError: "malformed payload" } });
    return false;
  }

  try {
    await postToSheet(payload);
    await prisma.sheetSyncJob.update({ where: { id: jobId }, data: { syncedAt: new Date(), lastError: null } });
    return true;
  } catch (err) {
    const attempts = job.attempts + 1;
    await prisma.sheetSyncJob.update({
      where: { id: jobId },
      data: { attempts, lastError: err instanceof Error ? err.message : String(err) },
    });
    if (attempts < MAX_ATTEMPTS) {
      const t = setTimeout(() => void runSheetSyncJob(jobId), BASE_BACKOFF_MS * 2 ** (attempts - 1));
      (t as { unref?: () => void }).unref?.(); // don't keep the process alive for a retry
    }
    return false;
  }
}

/**
 * Sweep every not-yet-synced job still under the attempt cap and try each once (§10). Safe to
 * call repeatedly — meant for a periodic cron and the admin manual-retry action. Non-blocking
 * for the caller's flow; each job's own backoff handles spacing between attempts.
 */
export async function drainSheetSyncJobs(): Promise<{ ran: number; synced: number }> {
  const pending = await prisma.sheetSyncJob.findMany({
    where: { syncedAt: null, attempts: { lt: MAX_ATTEMPTS } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  let synced = 0;
  for (const { id } of pending) if (await runSheetSyncJob(id)) synced++;
  return { ran: pending.length, synced };
}
