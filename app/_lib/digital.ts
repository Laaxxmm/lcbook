import type { SkuCode } from "@/lib/catalogue";

// Digital-product DISPLAY data (§3). These are sold on WiseApp, NOT here — display + redirect
// only. VISIBILITY is driven by URL presence in config/elearning.ts, never by price:
//   - missing EBOOK_URL  → hide the ebook row (MAT)
//   - missing COURSE_URL → "recorded course coming soon", no price, no CTA (CAT, CLAT)
//   - both missing       → hide the whole upsell panel
// Two known catalogue defects are honoured, not papered over:
//   1. PGCET MBA + MCA share one WiseApp destination → a single PGCET ebook price per SKU.
//   2. That destination is "PGCET Mocks", not "eBooks" → labelled for what the buyer lands on.
// Mirrors lib/email's DIGITAL map (that one is not exported; this is the public-page copy).
export interface DigitalInfo {
  ebookPaise: number;
  ebookLabel: string;
  coursePaise: number;
}

export const DIGITAL: Record<SkuCode, DigitalInfo> = {
  PGCET_MBA: { ebookPaise: 29_900, ebookLabel: "PGCET Mocks + eBook", coursePaise: 400_000 },
  PGCET_MCA: { ebookPaise: 34_900, ebookLabel: "PGCET Mocks + eBook", coursePaise: 400_000 },
  MAT: { ebookPaise: 34_900, ebookLabel: "eBook (1-year access)", coursePaise: 500_000 },
  CAT: { ebookPaise: 89_900, ebookLabel: "eBook (1-year access)", coursePaise: 0 },
  CLAT: { ebookPaise: 89_900, ebookLabel: "eBook (1-year access)", coursePaise: 0 },
};

// Effective DISPLAY prices (§3, §4). The admin-editable DB value wins when set (non-null — 0 is a
// valid price, so use ??, never ||); otherwise fall back to the DIGITAL map above so nothing breaks.
// DISPLAY + redirect only — these never touch a real Order amount, Razorpay charge, or invoice.
type SkuPrices = { code: string; ebookPricePaise?: number | null; coursePricePaise?: number | null };

export function effectiveEbookPaise(sku: SkuPrices): number {
  return sku.ebookPricePaise ?? DIGITAL[sku.code as SkuCode]?.ebookPaise ?? 0;
}

export function effectiveCoursePaise(sku: SkuPrices): number {
  return sku.coursePricePaise ?? DIGITAL[sku.code as SkuCode]?.coursePaise ?? 0;
}
