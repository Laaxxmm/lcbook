import "dotenv/config";
import { prisma } from "../lib/db";
import { SKU_CATALOGUE } from "../lib/catalogue";

// Seed the 5 physical book sets (spec §3). Idempotent: safe to re-run.
// Stock is admin-managed (§7, §14) — seeded at 0, set it in the admin panel.
async function main() {
  for (const s of SKU_CATALOGUE) {
    await prisma.sku.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        bookCount: s.bookCount,
        titles: s.titles,
        pricePaise: s.pricePaise,
        weightGrams: s.weightGrams,
      },
      create: {
        code: s.code,
        name: s.name,
        bookCount: s.bookCount,
        titles: s.titles,
        pricePaise: s.pricePaise,
        weightGrams: s.weightGrams,
        stockQty: 0,
      },
    });
    console.log(`seeded ${s.code} — ${s.name}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
