import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { CANCELLABLE_STATUSES, PAID_STATUSES } from "@/lib/orders/status";
import { SHIPPING_RATE_PER_KG_PAISE } from "@/config/pricing";
import { PageHeader, Card } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/status-badge";


// Admin dashboard (§14): the things that need a human — flags, cancellations, print queue,
// failed sheet syncs — plus a recent-orders glance.
export default async function DashboardPage() {
  const [received, paid, pending, shipped, completed, revenueAgg, shipWeightAgg, flagged, cancellations, printQueue, pendingSheet, recent] =
    await Promise.all([
      prisma.order.count(),
      // Paid = money collected (status-based, so manual admin confirms count too).
      prisma.order.count({ where: { status: { in: PAID_STATUSES } } }),
      // Pending = still awaiting payment.
      prisma.order.count({ where: { status: { in: [OrderStatus.CREATED, OrderStatus.PAYMENT_PENDING] } } }),
      // Shipped = dispatched (AWB entered → dispatchedAt set), incl. delivered/RTO.
      prisma.order.count({ where: { dispatchedAt: { not: null } } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      // Total revenue = sum of collected order amounts (paise), status-based.
      prisma.order.aggregate({ _sum: { amountPaise: true }, where: { status: { in: PAID_STATUSES } } }),
      // Shipping-cost estimate basis: total dispatched weight (snapshot grams).
      prisma.order.aggregate({ _sum: { snapshotWeightGrams: true }, where: { dispatchedAt: { not: null } } }),
      prisma.order.count({ where: { OR: [{ amountMismatchFlagged: true }, { refundStatus: "FAILED" }] } }),
      prisma.order.count({
        // Pending customer cancellation requests — matches the inbox filter (§6).
        where: { cancelRequestedAt: { not: null }, cancelReviewedAt: null, status: { in: CANCELLABLE_STATUSES } },
      }),
      prisma.order.count({ where: { status: { in: [OrderStatus.PRINT_QUEUED, OrderStatus.PRINT_STARTED] } } }),
      prisma.sheetSyncJob.count({ where: { syncedAt: null } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

  const revenuePaise = revenueAgg._sum.amountPaise ?? 0;
  const shippedGrams = shipWeightAgg._sum.snapshotWeightGrams ?? 0;
  const shippingEstPaise = Math.round((shippedGrams / 1000) * SHIPPING_RATE_PER_KG_PAISE);

  const kpis = [
    { href: "/admin/orders", label: "Orders received", value: received },
    { href: "/admin/orders", label: "Paid", value: paid },
    { href: "/admin/orders?status=PAYMENT_PENDING", label: "Pending payment", value: pending },
    { href: "/admin/orders?status=SHIPPED", label: "Shipped", value: shipped },
    { href: "/admin/orders?status=DELIVERED", label: "Completed", value: completed },
  ];

  const money = [
    { label: "Total revenue", value: formatRupees(revenuePaise), note: "captured payments" },
    { label: "Shipping cost (est.)", value: formatRupees(shippingEstPaise), note: "dispatched weight × rate" },
  ];

  const tiles = [
    { href: "/admin/flagged", label: "Flagged orders", value: flagged, tone: flagged > 0 },
    { href: "/admin/cancellations", label: "Cancellation inbox", value: cancellations, tone: cancellations > 0 },
    { href: "/admin/print-queue", label: "In print queue", value: printQueue, tone: false },
    { href: "/admin/sheet-sync", label: "Pending sheet syncs", value: pendingSheet, tone: pendingSheet > 0 },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Everything that needs a human, at a glance." />

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Orders</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Link key={k.href} href={k.href}>
            <Card className="h-full transition-colors hover:border-lc-green-700">
              <div className="text-[13px] font-semibold text-lc-green-400">{k.label}</div>
              <div className="mt-2 text-3xl font-extrabold text-lc-green-800">{k.value}</div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Revenue</h2>
      <div className="mb-8 grid grid-cols-2 gap-3">
        {money.map((m) => (
          <Card key={m.label} className="h-full">
            <div className="text-[13px] font-semibold text-lc-green-400">{m.label}</div>
            <div className="mt-2 text-2xl font-extrabold text-lc-green-800">{m.value}</div>
            <div className="mt-1 text-[11.5px] text-lc-green-400">{m.note}</div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">
        Needs attention
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="h-full transition-colors hover:border-lc-green-700">
              <div className="text-[13px] font-semibold text-lc-green-400">{t.label}</div>
              <div className={`mt-2 text-3xl font-extrabold ${t.tone ? "text-lc-gold" : "text-lc-green-800"}`}>
                {t.value}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">
        Recent orders
      </h2>
      <div className="grid gap-2">
        {recent.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`}>
            <Card className="flex flex-wrap items-center justify-between gap-2 py-3 transition-colors hover:border-lc-green-700">
              <div>
                <span className="font-semibold text-lc-green-800">{o.id}</span>
                <span className="ml-2 text-[14px] text-lc-green-400">
                  {o.snapshotName} · {formatRupees(o.amountPaise)}
                </span>
              </div>
              <StatusBadge status={o.status} />
            </Card>
          </Link>
        ))}
        {recent.length === 0 && <p className="text-[15px] text-lc-green-400">No orders yet.</p>}
      </div>
    </div>
  );
}
