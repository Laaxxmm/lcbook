import type { Sku } from "@prisma/client";
import type { SkuCode } from "@/lib/catalogue";

// Short exam badge shown above each set name (§15 item 1). Pure display; safe on client too.
export const EXAM_BADGE: Record<SkuCode, string> = {
  PGCET_MBA: "PGCET · MBA",
  PGCET_MCA: "PGCET · MCA",
  MAT: "MAT",
  CAT: "CAT",
  CLAT: "CLAT",
};

export function examBadge(code: string): string {
  return EXAM_BADGE[code as SkuCode] ?? code;
}

// ── Digital-product grouping (P0-2) ──────────────────────────────────────────────────────
// Two SKUs pointing at the SAME destination are ONE product: the PGCET mock series covers
// both MBA and MCA, so the Mocks tab was showing two ₹399 cards that led to one checkout.
// Group by effective URL and render one card per distinct destination. A missing URL still
// hides the SKU entirely (§3) — never a dead link, never a price with no destination.

export const BADGE_SEP = " · ";

/** A group always holds at least one SKU — say so in the type, so nothing needs a `[0]` guard. */
export type SkuGroup = [Sku, ...Sku[]];

/** "PGCET · MBA" → ["PGCET", "MBA"]; a badge with no variant → ["MAT", null]. */
export function splitBadge(code: string): [string, string | null] {
  const [head = code, tail = null] = examBadge(code).split(BADGE_SEP);
  return [head, tail];
}

/** The exam every SKU in the group shares, when each badge reads "<EXAM> · <VARIANT>". */
export function sharedExam(skus: SkuGroup): string | null {
  const [head] = splitBadge(skus[0].code);
  const shared = skus.every((s) => {
    const [h, tail] = splitBadge(s.code);
    return h === head && tail !== null;
  });
  return shared ? head : null;
}

function variantsOf(skus: SkuGroup): string[] {
  return skus.map((s) => splitBadge(s.code)[1] ?? "");
}

export function groupByUrl(
  skus: Sku[],
  urlOf: (s: Sku) => string | undefined,
): { href: string; skus: SkuGroup }[] {
  const byUrl = new Map<string, SkuGroup>();
  for (const sku of skus) {
    const href = urlOf(sku);
    if (!href) continue;
    const group = byUrl.get(href);
    if (group) group.push(sku);
    else byUrl.set(href, [sku]);
  }
  return [...byUrl].map(([href, group]) => ({ href, skus: group }));
}

/** "PGCET · MBA" + "PGCET · MCA" → "PGCET · MBA & MCA". Derived, not hardcoded to PGCET. */
export function groupBadge(skus: SkuGroup): string {
  if (skus.length === 1) return examBadge(skus[0].code);
  const head = sharedExam(skus);
  return head
    ? `${head}${BADGE_SEP}${variantsOf(skus).join(" & ")}`
    : skus.map((s) => examBadge(s.code)).join(" & ");
}

/** "PGCET Mock tests (MBA & MCA)"; a single SKU keeps its own set name. */
export function groupTitle(skus: SkuGroup, kind: string): string {
  if (skus.length === 1) return skus[0].name;
  const head = sharedExam(skus);
  return head
    ? `${head} ${kind} (${variantsOf(skus).join(" & ")})`
    : `${kind} (${skus.map((s) => examBadge(s.code)).join(" & ")})`;
}

/** Shared price → that price. Prices that differ → the lowest, flagged so the card says "from". */
export function groupPrice(skus: SkuGroup, priceOf: (s: Sku) => number) {
  const prices = skus.map(priceOf);
  const paise = Math.min(...prices);
  return { paise, from: prices.some((p) => p !== paise) };
}
