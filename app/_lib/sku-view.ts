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
