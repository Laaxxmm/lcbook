import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PageHeader, TableWrap, Th, Td, Empty } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/status-badge";
import { ActionButton } from "@/components/admin/action-button";
import { advanceOrder } from "@/app/admin/(panel)/actions";

// Print queue (§14, POD). Start printing fires the "cancellation window closed" email via the
// state-machine side-effect path (§6); mark-printed (POD) advances to PRINT_DONE.
export const dynamic = "force-dynamic";

export default async function PrintQueuePage() {
  const orders = await prisma.order.findMany({
    where: { status: { in: [OrderStatus.PRINT_QUEUED, OrderStatus.PRINT_STARTED] } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader title="Print queue" subtitle="Print-on-demand orders awaiting or in printing." />

      {orders.length === 0 ? (
        <Empty>Nothing in the print queue.</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Set</Th>
              <Th className="text-right">Qty</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-[rgba(14,59,46,0.03)]">
                <Td>
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-lc-green-700 underline underline-offset-2">
                    {o.id}
                  </Link>
                </Td>
                <Td>{o.snapshotName}</Td>
                <Td className="text-right">{o.qty}</Td>
                <Td><StatusBadge status={o.status} /></Td>
                <Td>
                  {o.status === OrderStatus.PRINT_QUEUED ? (
                    <ActionButton
                      action={advanceOrder}
                      hidden={{ orderId: o.id, toStatus: OrderStatus.PRINT_STARTED }}
                      variant="secondary"
                      size="sm"
                      confirm="Start printing? This closes the cancellation window and emails the customer."
                    >
                      Start printing
                    </ActionButton>
                  ) : (
                    <ActionButton
                      action={advanceOrder}
                      hidden={{ orderId: o.id, toStatus: OrderStatus.PRINT_DONE }}
                      variant="outline"
                      size="sm"
                    >
                      Mark printed (POD)
                    </ActionButton>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
