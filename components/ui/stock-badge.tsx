import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface StockBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** true → in stock; false → print-on-demand. Fulfilment state MUST be visible
   *  before payment, never discovered after (§15). */
  inStock: boolean;
}

// §7/§15 displayed SLAs: in stock → 1–2 working days; POD → 7–10 working days.
export function StockBadge({ inStock, className, ...props }: StockBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
        inStock
          ? "bg-[rgba(14,59,46,0.08)] text-lc-green-800"
          : "bg-[rgba(232,163,61,0.16)] text-lc-on-gold",
        className,
      )}
      {...props}
    >
      {inStock ? "In stock · dispatched in 1–2 working days" : "Made to order · ships in 7–10 working days"}
    </span>
  );
}
