import type { Prisma } from "@prisma/client";

// Google Sheet is a read-only mirror; Postgres is the source of truth (§10).
// Sync is non-blocking and retried: we only ENQUEUE here (inside the caller's txn),
// a background worker POSTs to SHEETS_WEBHOOK_URL with exponential backoff.
export type SheetName = "Orders" | "Cancellations" | "PrintQueue";

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
