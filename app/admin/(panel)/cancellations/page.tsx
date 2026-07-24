import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatRupees, computeRefund } from "@/lib/money";
import { PageHeader, Card, Empty } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/status-badge";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, inputCls } from "@/components/admin/action-form";
import { refundOrder, rejectCancellation } from "@/app/admin/(panel)/actions";

// Cancellation inbox (§14): cancellation requests awaiting a decision. Approve → initiateRefund
// (double-refund-guarded in lib/refunds) + refund-initiated email. Reject → notify the customer.
export const dynamic = "force-dynamic";

export default async function CancellationsPage() {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.CANCELLED_BY_USER, OrderStatus.CANCELLED_BY_ADMIN] },
      refundId: null,
    },
    orderBy: { cancelRequestedAt: "asc" },
  });

  return (
    <div>
      <PageHeader title="Cancellation inbox" subtitle="Approve to refund (minus gateway fee), or reject to notify the customer." />

      {orders.length === 0 ? (
        <Empty>No pending cancellations.</Empty>
      ) : (
        <div className="grid gap-4">
          {orders.map((o) => {
            const r = computeRefund(o.amountPaise);
            const byUser = o.status === OrderStatus.CANCELLED_BY_USER;
            return (
              <Card key={o.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-lc-green-700 underline underline-offset-2">
                      {o.id}
                    </Link>
                    <span className="ml-2 text-[14px] text-lc-green-400">
                      {o.snapshotName} · {o.customerName}
                    </span>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                <div className="mt-2 text-[14px] text-lc-green-400">
                  Paid {formatRupees(o.amountPaise)} · refund {formatRupees(r.refundAmountPaise)} (keep{" "}
                  {formatRupees(r.gatewayFeeRetainedPaise)})
                  {o.cancelReason ? ` · reason: "${o.cancelReason}"` : ""}
                </div>

                <div className="mt-4 flex flex-wrap items-start gap-3">
                  <ActionButton
                    action={refundOrder}
                    hidden={{ orderId: o.id }}
                    variant="secondary"
                    confirm={`Approve & refund ${formatRupees(r.refundAmountPaise)}? Calls Razorpay, can't be undone.`}
                  >
                    Approve → refund
                  </ActionButton>

                  {byUser && (
                    <ActionForm
                      action={rejectCancellation}
                      submitLabel="Reject & notify"
                      submitVariant="outline"
                      className="w-full max-w-sm"
                    >
                      <input type="hidden" name="orderId" value={o.id} />
                      <input name="note" placeholder="Reason to share with the customer (optional)" className={inputCls} />
                    </ActionForm>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
