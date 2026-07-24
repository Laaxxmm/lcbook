import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { effectiveEbookPaise, effectiveCoursePaise } from "@/app/_lib/digital";
import { PageHeader, Card, TableWrap, Th, Td } from "@/components/admin/ui";
import { ActionForm, inputCls } from "@/components/admin/action-form";
import { ActionButton } from "@/components/admin/action-button";
import { editSku, adjustStock, setSkuActive } from "@/app/admin/(panel)/actions";

// Per-SKU edit (§14): titles/price/weight edit, stock adjustment, deactivate/reactivate — all
// audited via lib/sku (writes SkuAudit; never hard-deletes). Recent audit trail shown below.
export const dynamic = "force-dynamic";

export default async function SkuEditPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sku = await prisma.sku.findUnique({ where: { code } });
  if (!sku) notFound();

  const audits = await prisma.skuAudit.findMany({
    where: { skuCode: code },
    orderBy: { changedAt: "desc" },
    take: 25,
  });

  return (
    <div>
      <PageHeader title={sku.code} subtitle={sku.active ? "Active" : "Deactivated"} />
      <Link href="/admin/skus" className="text-[13px] font-semibold text-lc-green-700 underline underline-offset-2">
        ← All SKUs
      </Link>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Edit catalogue fields</h2>
          <ActionForm action={editSku} submitLabel="Save changes">
            <input type="hidden" name="code" value={sku.code} />
            <div className="grid gap-2">
              <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                Name
                <input name="name" defaultValue={sku.name} className={inputCls} required />
              </label>
              <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                Titles (comma-separated)
                <input name="titles" defaultValue={sku.titles.join(", ")} className={inputCls} />
              </label>
              <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                eBook URL (optional — empty uses the default)
                <input name="ebookUrl" type="url" inputMode="url" placeholder="https://elearning.learncrew.org/…" defaultValue={sku.ebookUrl ?? ""} className={inputCls} />
              </label>
              <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                Course URL (optional — empty uses the default)
                <input name="courseUrl" type="url" inputMode="url" placeholder="https://elearning.learncrew.org/…" defaultValue={sku.courseUrl ?? ""} className={inputCls} />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                  eBook price (₹) — display only, empty uses the default
                  <input name="ebookPriceRupees" type="number" min={0} step="1" defaultValue={effectiveEbookPaise(sku) / 100} className={inputCls} />
                </label>
                <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                  Course price (₹) — display only, empty uses the default
                  <input name="coursePriceRupees" type="number" min={0} step="1" defaultValue={effectiveCoursePaise(sku) / 100} className={inputCls} />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                  Book count
                  <input name="bookCount" type="number" min={1} defaultValue={sku.bookCount} className={inputCls} required />
                </label>
                <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                  Price (₹)
                  <input name="priceRupees" type="number" min={1} step="1" defaultValue={sku.pricePaise / 100} className={inputCls} required />
                </label>
                <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                  Weight (g)
                  <input name="weightGrams" type="number" min={1} defaultValue={sku.weightGrams} className={inputCls} required />
                </label>
              </div>
            </div>
          </ActionForm>
        </Card>

        <div className="grid gap-5">
          <Card>
            <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Stock</h2>
            <p className="mb-3 text-[14px] text-lc-green-400">
              Current stock <strong className="text-lc-green-800">{sku.stockQty}</strong> · print queue {sku.printQueueCount}
            </p>
            <ActionForm action={adjustStock} submitLabel="Set stock" submitVariant="secondary">
              <input type="hidden" name="code" value={sku.code} />
              <label className="grid gap-1 text-[13px] font-semibold text-lc-green-400">
                New stock quantity
                <input name="stockQty" type="number" min={0} defaultValue={sku.stockQty} className={inputCls} required />
              </label>
            </ActionForm>
          </Card>

          <Card>
            <h2 className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Availability</h2>
            <p className="mb-3 text-[14px] text-lc-green-400">
              Deactivating hides the SKU from the store but keeps it (and its orders) intact — never deleted.
            </p>
            {sku.active ? (
              <ActionButton
                action={setSkuActive}
                hidden={{ code: sku.code, active: "false" }}
                variant="outline"
                confirm={`Deactivate ${sku.code}? It will stop selling but is never deleted.`}
              >
                Deactivate
              </ActionButton>
            ) : (
              <ActionButton action={setSkuActive} hidden={{ code: sku.code, active: "true" }} variant="secondary">
                Reactivate
              </ActionButton>
            )}
          </Card>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-semibold uppercase tracking-wide text-lc-green-400">Audit trail</h2>
      {audits.length === 0 ? (
        <p className="text-[14px] text-lc-green-400">No changes recorded yet.</p>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Field</Th>
              <Th>Old</Th>
              <Th>New</Th>
              <Th>When</Th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.id}>
                <Td className="font-semibold">{a.field}</Td>
                <Td className="text-lc-green-400">{a.oldValue ?? "—"}</Td>
                <Td>{a.newValue ?? "—"}</Td>
                <Td className="whitespace-nowrap text-[13px] text-lc-green-400">
                  {a.changedAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}
