import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { PageHeader, Card, Empty } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/status-badge";

// Flagged orders (§14): the two flags the payment/refund layer sets —
//   amountMismatchFlagged — set in lib/webhook when a payment.captured amount ≠ stored amount
//                           (order is NOT auto-confirmed; §9).
//   refundStatus = FAILED — set in lib/webhook on a refund.failed event.
// Surface both; resolve via the order's own legal transitions on the detail page.
export const dynamic = "force-dynamic";

export default async function FlaggedPage() {
  const orders = await prisma.order.findMany({
    where: { OR: [{ amountMismatchFlagged: true }, { refundStatus: "FAILED" }] },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Flagged orders" subtitle="Amount mismatches and refund failures needing review." />

      {orders.length === 0 ? (
        <Empty>No flagged orders. All clear.</Empty>
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => (
            <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/admin/orders/${o.id}`} className="font-semibold text-lc-green-700 underline underline-offset-2">
                  {o.id}
                </Link>
                <span className="ml-2 text-[14px] text-lc-green-400">
                  {o.snapshotName} · {formatRupees(o.amountPaise)}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {o.amountMismatchFlagged && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[12px] font-semibold text-red-700">
                      Amount mismatch — not auto-confirmed
                    </span>
                  )}
                  {o.refundStatus === "FAILED" && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[12px] font-semibold text-red-700">
                      Refund failed at gateway
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={o.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
