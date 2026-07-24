import "dotenv/config";
import { prisma } from "../lib/db";
import { SKU_CATALOGUE } from "../lib/catalogue";
import { EBOOK_URL, COURSE_URL } from "../config/elearning";
import { DIGITAL } from "../app/_lib/digital";

// Seed the 5 physical book sets (spec §3). Idempotent: safe to re-run.
// Stock is admin-managed (§7, §14) — seeded at 0, set it in the admin panel.
// eBook/Course URLs and DISPLAY prices are backfilled from config so existing rows get the
// admin-editable defaults; admin may override them per SKU later (§3, §14).
async function main() {
  for (const s of SKU_CATALOGUE) {
    const ebookUrl = EBOOK_URL[s.code] ?? null;
    const courseUrl = COURSE_URL[s.code] ?? null;
    const ebookPricePaise = DIGITAL[s.code]?.ebookPaise ?? null;
    const coursePricePaise = DIGITAL[s.code]?.coursePaise ?? null;
    await prisma.sku.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        bookCount: s.bookCount,
        titles: s.titles,
        pricePaise: s.pricePaise,
        weightGrams: s.weightGrams,
        ebookUrl,
        courseUrl,
        ebookPricePaise,
        coursePricePaise,
      },
      create: {
        code: s.code,
        name: s.name,
        bookCount: s.bookCount,
        titles: s.titles,
        pricePaise: s.pricePaise,
        weightGrams: s.weightGrams,
        stockQty: 0,
        ebookUrl,
        courseUrl,
        ebookPricePaise,
        coursePricePaise,
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
