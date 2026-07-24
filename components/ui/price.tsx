import type { HTMLAttributes } from "react";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";

interface PriceProps extends HTMLAttributes<HTMLDivElement> {
  /** Integer paise (never float — §4). */
  paise: number;
  /** Prices include shipping (§3). Renders the affordance, never a ₹0 shipping line (§16). */
  shippingIncluded?: boolean;
}

/** Renders integer paise as a ₹ string with the "shipping included" affordance. */
export function Price({ paise, shippingIncluded = true, className, ...props }: PriceProps) {
  return (
    <div className={cn("flex items-baseline gap-2", className)} {...props}>
      <span className="text-2xl font-extrabold tracking-tight text-lc-green-800">
        {formatRupees(paise)}
      </span>
      {shippingIncluded && (
        <span className="text-sm font-medium text-lc-green-400">shipping included</span>
      )}
    </div>
  );
}
