import type { Sku } from "@prisma/client";
import { prisma } from "@/lib/db";

// Editable catalogue fields (spec §14 SKU CRUD). Admin can edit freely; every change
// writes a SkuAudit row and deactivate never deletes. Past orders are unaffected —
// they carry a frozen snapshot (§5).
export interface SkuChanges {
  name?: string;
  titles?: string[];
  pricePaise?: number;
  weightGrams?: number;
  bookCount?: number;
  stockQty?: number;
  active?: boolean;
  // Outbound e-learning links (§3). Pass "" to clear (falls back to config default).
  ebookUrl?: string | null;
  courseUrl?: string | null;
}

function serialise(v: unknown): string {
  return Array.isArray(v) ? v.join(", ") : String(v);
}

/** Update a SKU, writing one SkuAudit row per changed field, in a single txn. */
export async function updateSku(code: string, changes: SkuChanges): Promise<Sku> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.sku.findUnique({ where: { code } });
    if (!current) throw new Error(`sku not found: ${code}`);

    const audits: { field: string; oldValue: string; newValue: string }[] = [];
    for (const [field, next] of Object.entries(changes) as [keyof SkuChanges, unknown][]) {
      if (next === undefined) continue;
      const prev = current[field as keyof Sku];
      if (serialise(prev) !== serialise(next)) {
        audits.push({ field, oldValue: serialise(prev), newValue: serialise(next) });
      }
    }

    const updated = await tx.sku.update({ where: { code }, data: changes });
    if (audits.length > 0) {
      await tx.skuAudit.createMany({ data: audits.map((a) => ({ skuCode: code, ...a })) });
    }
    return updated;
  });
}
