import type { SkuCode } from "@/lib/catalogue";

// Outbound e-learning links (spec §3). Ebooks and recorded courses are NOT sold by
// this app — they live on WiseApp at elearning.learncrew.org. Display + redirect only.
export const ELEARNING_BASE = "https://elearning.learncrew.org";

// A MISSING URL HIDES THAT ROW ENTIRELY. Never render a dead link or a price with
// no destination. If both are missing for a SKU, hide the whole upsell panel (§3).
export const EBOOK_URL: Partial<Record<SkuCode, string>> = {
  PGCET_MBA: `${ELEARNING_BASE}/courses/pgcet-mocks-69d3578e6f866cda970fc248`,
  PGCET_MCA: `${ELEARNING_BASE}/courses/pgcet-mocks-69d3578e6f866cda970fc248`,
  CAT: `${ELEARNING_BASE}/courses/cat-ebooks-6a631b7b7f1baa6dae1575d0`,
  CLAT: `${ELEARNING_BASE}/courses/clat-ebooks-6a631d443c7b5e1a6eca47b5`,
  // MAT — not yet published on WiseApp.
};

// Outbound Mocks links (§3), mirror of EBOOK_URL. Empty for now — admin fills links per SKU;
// a missing URL hides that SKU's Mocks card entirely (never a dead link).
export const MOCKS_URL: Partial<Record<SkuCode, string>> = {};

export const COURSE_URL: Partial<Record<SkuCode, string>> = {
  PGCET_MBA: `${ELEARNING_BASE}/courses/post-graduation-common-entrance-test-mba-67b48880dce76a43183438f6`,
  PGCET_MCA: `${ELEARNING_BASE}/courses/post-graduation-common-entrance-test-mca-67b48a8b0e2e2fc50fdd9f25`,
  MAT: `${ELEARNING_BASE}/courses/management-aptitude-test-672db9fc5ee436b9bc6485e3`,
  // CAT, CLAT — recorded course not yet launched.
};

// The DB-override-or-default resolvers for these URLs live in app/_lib/digital.ts, alongside
// the digital price resolvers — one coherent place for every "effective" digital value (§3).

// Append to any outbound e-learning URL. Include the order id where one exists.
export function elearningUtm(orderId?: string): string {
  const base = "?ref=publications&utm_source=publications&utm_medium=referral";
  return orderId ? `${base}&order=${encodeURIComponent(orderId)}` : base;
}
