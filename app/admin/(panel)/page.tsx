import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { PageHeader, Card } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/status-badge";

// Admin dashboard (§14): the things that need a human — flags, cancellations, print queue,
// failed sheet syncs — plus a recent-orders glance.
export default async function DashboardPage() {
  const [flagged, cancellations, printQueue, pendingSheet, recent] = await Promise.all([
    prisma.order.count({ where: { OR: [{ amountMismatchFlagged: true }, { refundStatus: "FAILED" }] } }),
    prisma.order.count({
      where: { status: { in: [OrderStatus.CANCELLED_BY_USER, OrderStatus.CANCELLED_BY_ADMIN] }, refundId: null },
    }),
    prisma.order.count({ where: { status: { in: [OrderStatus.PRINT_QUEUED, OrderStatus.PRINT_STARTED] } } }),
    prisma.sheetSyncJob.count({ where: { syncedAt: null } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const tiles = [
    { href: "/admin/flagged", label: "Flagged orders", value: flagged, tone: flagged > 0 },
    { href: "/admin/cancellations", label: "Cancellation inbox", value: cancellations, tone: cancellations > 0 },
    { href: "/admin/print-queue", label: "In print queue", value: printQueue, tone: false },
    { href: "/admin/sheet-sync", label: "Pending sheet syncs", value: pendingSheet, tone: pendingSheet > 0 },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Everything that needs a human, at a glance." />

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
