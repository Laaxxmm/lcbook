import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { PageHeader, Card, TableWrap, Th, Td } from "@/components/admin/ui";
import { ActionForm, inputCls } from "@/components/admin/action-form";
import { createSku } from "@/app/admin/(panel)/actions";

// SKU list + create (§14). Edit / stock / deactivate live on the per-SKU page. Every mutation
// there is audited via lib/sku; deactivate never deletes.
export const dynamic = "force-dynamic";

export default async function SkusPage() {
  const [skus, podPending] = await Promise.all([
    prisma.sku.findMany({ orderBy: { code: "asc" } }),
    // LIVE print backlog per SKU = units of orders actually awaiting/in printing (summed by qty),
    // matching the Print queue page + dashboard. The stored Sku.printQueueCount only ever
    // increments (§7), so it lingers after an order ships — don't display it.
    prisma.order.groupBy({
      by: ["skuCode"],
      where: { status: { in: [OrderStatus.PRINT_QUEUED, OrderStatus.PRINT_STARTED] } },
      _sum: { qty: true },
    }),
  ]);
  const liveQueue = new Map(podPending.map((g) => [g.skuCode, g._sum.qty ?? 0]));

  return (
    <div>
      <PageHeader title="SKUs" subtitle="Catalogue is editable freely — past orders keep a frozen snapshot." />

      <TableWrap>
        <thead>
          <tr>
            <Th>Code</Th>
            <Th>Name</Th>
            <Th className="text-right">Price</Th>
            <Th className="text-right">Weight</Th>
            <Th className="text-right">Books</Th>
            <Th className="text-right">Stock</Th>
            <Th className="text-right">Print queue</Th>
            <Th>Active</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {skus.map((s) => (
            <tr key={s.code} className="hover:bg-[rgba(14,59,46,0.03)]">
              <Td className="font-semibold">{s.code}</Td>
              <Td>{s.name}</Td>
              <Td className="text-right">{formatRupees(s.pricePaise)}</Td>
              <Td className="text-right">{s.weightGrams} g</Td>
              <Td className="text-right">{s.bookCount}</Td>
              <Td className="text-right font-semibold">{s.stockQty}</Td>
              <Td className="text-right">{liveQueue.get(s.code) ?? 0}</Td>
              <Td>{s.active ? "Yes" : <span className="text-red-700">No</span>}</Td>
              <Td>
                <Link href={`/admin/skus/${s.code}`} className="font-semibold text-lc-green-700 underline underline-offset-2">
                  Edit
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Card className="mt-8 max-w-xl">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Create a SKU</h2>
        <ActionForm action={createSku} submitLabel="Create SKU">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
              Code
              <input name="code" placeholder="PGCET_MBA" className={inputCls} required />
            </label>
            <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
              Name
              <input name="name" placeholder="PGCET MBA book set" className={inputCls} required />
            </label>
            <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400 sm:col-span-2">
              Titles (comma-separated)
              <input name="titles" placeholder="Logical, Quantitative, English" className={inputCls} />
            </label>
            <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
              Book count
              <input name="bookCount" type="number" min={1} inputMode="numeric" className={inputCls} required />
            </label>
            <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
              Price (₹)
              <input name="priceRupees" type="number" min={1} step="1" inputMode="decimal" className={inputCls} required />
            </label>
            <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
              Weight (grams)
              <input name="weightGrams" type="number" min={1} inputMode="numeric" className={inputCls} required />
            </label>
            <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
              Initial stock
              <input name="stockQty" type="number" min={0} defaultValue={0} inputMode="numeric" className={inputCls} />
            </label>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
