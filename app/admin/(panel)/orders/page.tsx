import Link from "next/link";
import { Prisma, OrderStatus, FulfilmentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { PageHeader, TableWrap, Th, Td, Empty } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/status-badge";
import { inputCls } from "@/components/admin/action-form";
import { Button } from "@/components/ui/button";

// Orders list (§14) — filter by status, SKU, fulfilment type, date. Filters are a native GET
// form (no client JS): submitting reloads with query params the page reads back into the query.
export const dynamic = "force-dynamic";

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = one(sp.status);
  const sku = one(sp.sku);
  const fulfilment = one(sp.fulfilment);
  const from = one(sp.from);
  const to = one(sp.to);

  const where: Prisma.OrderWhereInput = {};
  if (status && status in OrderStatus) where.status = status as OrderStatus;
  if (sku) where.skuCode = sku;
  if (fulfilment && fulfilment in FulfilmentType) where.fulfilmentType = fulfilment as FulfilmentType;
  if (from || to) {
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(`${from}T00:00:00`);
    if (to) range.lte = new Date(`${to}T23:59:59.999`);
    where.createdAt = range;
  }

  const [orders, skus] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.sku.findMany({ orderBy: { code: "asc" }, select: { code: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${orders.length} shown (newest first, capped at 200).`} />

      <form method="get" className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <select name="status" defaultValue={status} className={inputCls} aria-label="Status">
          <option value="">All statuses</option>
          {Object.values(OrderStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="sku" defaultValue={sku} className={inputCls} aria-label="SKU">
          <option value="">All SKUs</option>
          {skus.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code}
            </option>
          ))}
        </select>
        <select name="fulfilment" defaultValue={fulfilment} className={inputCls} aria-label="Fulfilment">
          <option value="">All fulfilment</option>
          <option value="IN_STOCK">In stock</option>
          <option value="POD">Print on demand</option>
        </select>
        <input type="date" name="from" defaultValue={from} className={inputCls} aria-label="From date" />
        <input type="date" name="to" defaultValue={to} className={inputCls} aria-label="To date" />
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Filter
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/orders">Reset</Link>
          </Button>
        </div>
      </form>

      {orders.length === 0 ? (
        <Empty>No orders match these filters.</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Status</Th>
              <Th>SKU</Th>
              <Th>Fulfilment</Th>
              <Th className="text-right">Amount</Th>
              <Th>Customer</Th>
              <Th>Created</Th>
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
                <Td><StatusBadge status={o.status} /></Td>
                <Td>{o.skuCode}</Td>
                <Td>{o.fulfilmentType ?? "—"}</Td>
                <Td className="text-right font-semibold">{formatRupees(o.amountPaise)}</Td>
                <Td>
                  <div>{o.customerName}</div>
                  <div className="text-[12px] text-lc-green-400">{o.city}, {o.state}</div>
                </Td>
                <Td className="whitespace-nowrap text-[13px] text-lc-green-400">
                  {o.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
