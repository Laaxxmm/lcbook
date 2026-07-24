import type { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

// Order status → readable label + tone. Colours drawn from §16 tokens (green = healthy/live,
// gold = attention/POD, red = failed/cancelled, grey = terminal-neutral).
const TONE: Record<OrderStatus, { label: string; cls: string }> = {
  CREATED: { label: "Created", cls: "bg-[rgba(14,59,46,0.06)] text-lc-green-400" },
  PAYMENT_PENDING: { label: "Payment pending", cls: "bg-[rgba(232,163,61,0.16)] text-lc-on-gold" },
  PAYMENT_FAILED: { label: "Payment failed", cls: "bg-red-100 text-red-700" },
  PAID: { label: "Paid", cls: "bg-[rgba(14,59,46,0.10)] text-lc-green-800" },
  CONFIRMED: { label: "Confirmed", cls: "bg-[rgba(14,59,46,0.10)] text-lc-green-800" },
  PICKING: { label: "Picking", cls: "bg-[rgba(14,59,46,0.10)] text-lc-green-800" },
  PACKED: { label: "Packed", cls: "bg-[rgba(14,59,46,0.10)] text-lc-green-800" },
  SHIPPED: { label: "Shipped", cls: "bg-[rgba(14,59,46,0.14)] text-lc-green-800" },
  DELIVERED: { label: "Delivered", cls: "bg-lc-green-800 text-lc-cream" },
  PRINT_QUEUED: { label: "Print queued", cls: "bg-[rgba(232,163,61,0.16)] text-lc-on-gold" },
  PRINT_STARTED: { label: "Printing", cls: "bg-[rgba(232,163,61,0.22)] text-lc-on-gold" },
  PRINT_DONE: { label: "Printed", cls: "bg-[rgba(232,163,61,0.16)] text-lc-on-gold" },
  CANCELLED_BY_USER: { label: "Cancel requested", cls: "bg-red-100 text-red-700" },
  CANCELLED_BY_ADMIN: { label: "Cancelled (admin)", cls: "bg-red-100 text-red-700" },
  REFUND_INITIATED: { label: "Refund initiated", cls: "bg-red-50 text-red-700" },
  REFUNDED: { label: "Refunded", cls: "bg-neutral-200 text-neutral-700" },
  RTO: { label: "Returned (RTO)", cls: "bg-neutral-200 text-neutral-700" },
  DAMAGE_REPLACEMENT: { label: "Replacement", cls: "bg-[rgba(232,163,61,0.16)] text-lc-on-gold" },
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const t = TONE[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold", t.cls, className)}>
      {t.label}
    </span>
  );
}

export function statusLabel(status: OrderStatus): string {
  return TONE[status].label;
}
