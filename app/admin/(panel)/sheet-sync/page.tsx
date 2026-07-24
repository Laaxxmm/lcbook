import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, TableWrap, Th, Td, Empty } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";
import { retrySheetJob, drainSheetJobs } from "@/app/admin/(panel)/actions";

// Sheet sync status (§10/§14): SheetSyncJob rows with attempts / last error / synced-at, plus
// manual retry (one job) and drain-all (whole backlog under the attempt cap).
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 6; // mirrors lib/sheet-sync; used only to label a job as exhausted.

function sheetName(payload: unknown): string {
  if (payload && typeof payload === "object" && "sheet" in payload) {
    const s = (payload as { sheet?: unknown }).sheet;
    if (typeof s === "string") return s;
  }
  return "—";
}

export default async function SheetSyncPage() {
  const jobs = await prisma.sheetSyncJob.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const pending = jobs.filter((j) => !j.syncedAt && j.attempts < MAX_ATTEMPTS).length;

  return (
    <div>
      <PageHeader
        title="Sheet sync"
        subtitle="Google Sheet is a read-only mirror; Postgres is source of truth. Failures surface here."
        action={
          <ActionButton action={drainSheetJobs} variant="secondary" size="sm">
            Retry all pending{pending ? ` (${pending})` : ""}
          </ActionButton>
        }
      />

      {jobs.length === 0 ? (
        <Empty>No sync jobs yet.</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Sheet</Th>
              <Th className="text-right">Attempts</Th>
              <Th>State</Th>
              <Th>Last error</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const done = j.syncedAt != null;
              const exhausted = !done && j.attempts >= MAX_ATTEMPTS;
              return (
                <tr key={j.id} className="hover:bg-[rgba(14,59,46,0.03)]">
                  <Td>
                    <Link href={`/admin/orders/${j.orderId}`} className="font-semibold text-lc-green-700 underline underline-offset-2">
                      {j.orderId}
                    </Link>
                  </Td>
                  <Td>{sheetName(j.payload)}</Td>
                  <Td className="text-right">{j.attempts}</Td>
                  <Td>
                    {done ? (
                      <span className="font-semibold text-lc-green-800">Synced</span>
                    ) : exhausted ? (
                      <span className="font-semibold text-red-700">Failed (exhausted)</span>
                    ) : (
                      <span className="font-semibold text-lc-on-gold">Pending</span>
                    )}
                  </Td>
                  <Td className="max-w-[280px]">
                    <span className="line-clamp-2 text-[13px] text-lc-green-400">{j.lastError ?? "—"}</span>
                  </Td>
                  <Td>
                    {!done && (
                      <ActionButton action={retrySheetJob} hidden={{ jobId: j.id }} variant="outline" size="sm">
                        Retry
                      </ActionButton>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
