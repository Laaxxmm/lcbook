import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatRupees, computeRefund } from "@/lib/money";
import { PageHeader, Card, KV } from "@/components/admin/ui";
import { StatusBadge, statusLabel } from "@/components/admin/status-badge";
import { TransitionControls } from "@/components/admin/transitions";

// Order detail (§14): full snapshot + the append-only OrderEvent timeline + legal-transition
// controls. Everything read-only here renders from the order row (invoice value uses the frozen
// snapshot, §5).
export const dynamic = "force-dynamic";

function dt(d: Date): string {
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();

  const flags: string[] = [];
  if (order.amountMismatchFlagged) flags.push("Webhook amount did not match the stored order amount — not auto-confirmed.");
  if (order.refundStatus === "FAILED") flags.push("A refund attempt failed at the gateway.");

  const preview = computeRefund(order.amountPaise);

  return (
    <div>
      <PageHeader
        title={order.id}
        subtitle={`${order.snapshotName} · ${order.snapshotBookCount} books`}
        action={<StatusBadge status={order.status} className="text-[13px]" />}
      />
      <Link href="/admin/orders" className="text-[13px] font-semibold text-lc-green-700 underline underline-offset-2">
        ← All orders
      </Link>

      {flags.length > 0 && (
        <div className="mt-4 rounded-[12px] border border-red-200 bg-red-50 p-4">
          <div className="text-[13px] font-bold uppercase tracking-wide text-red-700">Flagged</div>
          <ul className="mt-1 list-disc pl-5 text-[14px] text-red-700">
            {flags.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Order</h2>
          <KV k="Status" v={statusLabel(order.status)} />
          <KV k="Fulfilment" v={order.fulfilmentType ?? "—"} />
          <KV k="Quantity" v={String(order.qty)} />
          <KV k="Amount paid" v={formatRupees(order.amountPaise)} />
          <KV k="Invoice (Bill of Supply)" v={order.invoiceNumber ?? "—"} />
          <KV k="Course discount code" v={order.discountCode ?? "—"} />
          <KV k="Created" v={dt(order.createdAt)} />
          {order.awb && <KV k="AWB" v={order.awb} />}
          {order.courier && <KV k="Courier" v={order.courier} />}
          {order.dispatchedAt && <KV k="Dispatched" v={dt(order.dispatchedAt)} />}
          {order.printStartedAt && <KV k="Print started" v={dt(order.printStartedAt)} />}
        </Card>

        <Card>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Customer</h2>
          <KV k="Name" v={order.customerName} />
          <KV k="Email" v={order.customerEmail} />
          <KV k="Phone" v={order.customerPhone} />
          <KV
            k="Address"
            v={
              <span className="text-right">
                {order.addrLine1}{order.addrLine2 ? `, ${order.addrLine2}` : ""}<br />
                {order.city}, {order.state} {order.pincode}
              </span>
            }
          />
          <KV k="Marketing consent" v={order.marketingConsent ? `Yes (${order.consentAt ? dt(order.consentAt) : "—"})` : "No"} />
        </Card>

        <Card>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">
            Payment &amp; refund
          </h2>
          <KV k="Razorpay order" v={order.razorpayOrderId ?? "—"} />
          <KV k="Razorpay payment" v={order.razorpayPaymentId ?? "—"} />
          <KV k="Refund status" v={order.refundStatus ?? "—"} />
          <KV k="Refund id" v={order.refundId ?? "—"} />
          <KV
            k="Refund (if cancelled)"
            v={
              order.refundAmountPaise != null
                ? `${formatRupees(order.refundAmountPaise)} (kept ${formatRupees(order.gatewayFeeRetainedPaise ?? 0)})`
                : `${formatRupees(preview.refundAmountPaise)} preview (keep ${formatRupees(preview.gatewayFeeRetainedPaise)})`
            }
          />
          {order.cancelReason && <KV k="Cancel reason" v={order.cancelReason} />}
        </Card>

        <Card>
          <TransitionControls order={order} />
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">
        Event timeline (append-only)
      </h2>
      <Card className="p-0">
        <ol className="divide-y divide-lc-border">
          {order.events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3">
              <div>
                <span className="font-semibold text-lc-green-800">
                  {e.fromStatus ? `${statusLabel(e.fromStatus)} → ` : ""}{statusLabel(e.toStatus)}
                </span>
                <span className="ml-2 rounded-full bg-[rgba(14,59,46,0.06)] px-2 py-0.5 text-[11px] font-semibold text-lc-green-400">
                  {e.actor}
                </span>
                {e.metadata != null && (
                  <pre className="mt-1 max-w-full overflow-x-auto text-[12px] text-lc-green-400">
                    {JSON.stringify(e.metadata)}
                  </pre>
                )}
              </div>
              <span className="whitespace-nowrap text-[12px] text-lc-green-400">{dt(e.createdAt)}</span>
            </li>
          ))}
          {order.events.length === 0 && (
            <li className="px-5 py-3 text-[14px] text-lc-green-400">No events yet.</li>
          )}
        </ol>
      </Card>
    </div>
  );
}
