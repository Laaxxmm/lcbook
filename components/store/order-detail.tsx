import type { Order } from "@prisma/client";
import { formatRupees } from "@/lib/money";

// Read-only order view shown on /track once identity is proven (magic link, session, or a
// verified order-id+phone token). Plain-language status, delivery window (§7), and the amount
// paid — never any payment secrets.

const STATUS: Record<Order["status"], { label: string; blurb: string }> = {
  CREATED: { label: "Started", blurb: "Your order was started but payment isn't complete yet." },
  PAYMENT_PENDING: { label: "Awaiting payment", blurb: "We're waiting for your payment to complete." },
  PAYMENT_FAILED: { label: "Payment failed", blurb: "Payment didn't go through. You can place the order again." },
  PAID: { label: "Payment received", blurb: "Thanks — we've received your payment and are confirming your order." },
  CONFIRMED: { label: "Confirmed", blurb: "Your order is confirmed and being prepared." },
  PICKING: { label: "Being packed", blurb: "We're picking your set from stock." },
  PACKED: { label: "Packed", blurb: "Your set is packed and waiting for courier pickup." },
  SHIPPED: { label: "Shipped", blurb: "On its way. Use the tracking details below." },
  DELIVERED: { label: "Delivered", blurb: "Delivered. We hope it helps your prep." },
  PRINT_QUEUED: { label: "In print queue", blurb: "Printed to order — queued for printing." },
  PRINT_STARTED: { label: "Printing", blurb: "Printing has started. This order can no longer be cancelled." },
  PRINT_DONE: { label: "Printed", blurb: "Printing is done — packing next." },
  CANCELLED_BY_USER: { label: "Cancellation requested", blurb: "Your cancellation is with our team for review." },
  CANCELLED_BY_ADMIN: { label: "Cancelled", blurb: "This order was cancelled." },
  REFUND_INITIATED: { label: "Refund initiated", blurb: "Your refund is on its way to your original payment method." },
  REFUNDED: { label: "Refunded", blurb: "Your refund is complete." },
  RTO: { label: "Returned to origin", blurb: "The courier returned this to us. We'll be in touch." },
  DAMAGE_REPLACEMENT: { label: "Replacement in progress", blurb: "We're arranging a replacement for transit damage." },
};

function slaLine(order: Order): string | null {
  if (order.fulfilmentType === "IN_STOCK") return "In stock — dispatched in 1–2 working days.";
  if (order.fulfilmentType === "POD") return "Printed to order — dispatched in 7–10 working days.";
  return null;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-lc-border py-2 first:border-t-0">
      <span className="text-lc-green-400">{k}</span>
      <span className="text-right font-semibold text-lc-green-800">{v}</span>
    </div>
  );
}

export function OrderDetail({ order }: { order: Order }) {
  const s = STATUS[order.status];
  const sla = slaLine(order);

  return (
    <div className="mt-6">
      <div className="rounded-[14px] border border-lc-border bg-white p-5">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">
          Order {order.id}
        </div>
        <div className="mt-1 text-xl font-extrabold text-lc-green-800">{s.label}</div>
        <p className="mt-1 text-[15px] text-lc-green-400">{s.blurb}</p>
        {sla && <p className="mt-1 text-[13px] text-lc-green-400">{sla}</p>}

        <div className="mt-4 text-[14px]">
          <Row k="Set" v={`${order.snapshotName} · ${order.snapshotBookCount} books`} />
          <Row k="Quantity" v={String(order.qty)} />
          <Row k="Amount paid" v={`${formatRupees(order.amountPaise)} (shipping included)`} />
          {order.invoiceNumber && <Row k="Bill of Supply" v={order.invoiceNumber} />}
          {order.courier && <Row k="Courier" v={order.courier} />}
          {order.awb && <Row k="Tracking / AWB" v={order.awb} />}
          {order.refundAmountPaise != null && (
            <Row k="Refund" v={formatRupees(order.refundAmountPaise)} />
          )}
        </div>
      </div>

      <p className="mt-4 text-[13px] text-lc-green-400">
        Shipping to {order.city}, {order.state} {order.pincode}. Questions? Reply to your
        confirmation email or write to support@learncrew.org.
      </p>
    </div>
  );
}
