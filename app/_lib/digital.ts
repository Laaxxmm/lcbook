import type { SkuCode } from "@/lib/catalogue";
import { EBOOK_URL, COURSE_URL, MOCKS_URL } from "@/config/elearning";

// Digital-product DISPLAY data (§3). These are sold on WiseApp, NOT here — display + redirect
// only. VISIBILITY is driven by URL presence in config/elearning.ts, never by price:
//   - missing EBOOK_URL  → hide the ebook row (MAT)
//   - missing COURSE_URL → "recorded course coming soon", no price, no CTA (CAT, CLAT)
//   - both missing       → hide the whole upsell panel
// eBook, Mocks and Course are three SEPARATE products now, each with its own admin-editable
// URL + price per SKU (config values here are only fallbacks/defaults). Labels are generic.
// Mirrors lib/email's DIGITAL map (that one is not exported; this is the public-page copy).
export interface DigitalInfo {
  ebookPaise: number;
  ebookLabel: string;
  coursePaise: number;
  mockLabel: string;
  // Optional default mock price; admin sets it per SKU (absent → resolver returns 0).
  mockPaise?: number;
}

const MOCK_LABEL = "Mock tests (1-year access)";
export const DIGITAL: Record<SkuCode, DigitalInfo> = {
  PGCET_MBA: { ebookPaise: 29_900, ebookLabel: "eBook (1-year access)", coursePaise: 400_000, mockLabel: MOCK_LABEL },
  PGCET_MCA: { ebookPaise: 34_900, ebookLabel: "eBook (1-year access)", coursePaise: 400_000, mockLabel: MOCK_LABEL },
  MAT: { ebookPaise: 34_900, ebookLabel: "eBook (1-year access)", coursePaise: 500_000, mockLabel: MOCK_LABEL },
  CAT: { ebookPaise: 89_900, ebookLabel: "eBook (1-year access)", coursePaise: 0, mockLabel: MOCK_LABEL },
  CLAT: { ebookPaise: 89_900, ebookLabel: "eBook (1-year access)", coursePaise: 0, mockLabel: MOCK_LABEL },
};

// Effective DISPLAY values (§3, §4) — the single place that resolves "DB override or config
// default" for every digital field. DISPLAY + redirect only; these never touch a real Order
// amount, Razorpay charge, or invoice.
//   URLs   → admin value wins when non-empty after trim (|| — "" means "use the default");
//            an empty result HIDES that row/panel, never a dead link.
//   Prices → admin value wins when non-null (?? — 0 is a valid price, e.g. CAT/CLAT course);
//            otherwise fall back to the DIGITAL map above.
type SkuEffective = {
  code: string;
  ebookUrl?: string | null;
  courseUrl?: string | null;
  mockUrl?: string | null;
  ebookPricePaise?: number | null;
  coursePricePaise?: number | null;
  mockPricePaise?: number | null;
};

export function effectiveEbookUrl(sku: SkuEffective): string | undefined {
  return sku.ebookUrl?.trim() || EBOOK_URL[sku.code as SkuCode];
}

export function effectiveMockUrl(sku: SkuEffective): string | undefined {
  return sku.mockUrl?.trim() || MOCKS_URL[sku.code as SkuCode];
}

export function effectiveCourseUrl(sku: SkuEffective): string | undefined {
  return sku.courseUrl?.trim() || COURSE_URL[sku.code as SkuCode];
}

export function effectiveEbookPaise(sku: SkuEffective): number {
  return sku.ebookPricePaise ?? DIGITAL[sku.code as SkuCode]?.ebookPaise ?? 0;
}

export function effectiveMockPaise(sku: SkuEffective): number {
  return sku.mockPricePaise ?? DIGITAL[sku.code as SkuCode]?.mockPaise ?? 0;
}

export function effectiveCoursePaise(sku: SkuEffective): number {
  return sku.coursePricePaise ?? DIGITAL[sku.code as SkuCode]?.coursePaise ?? 0;
}
