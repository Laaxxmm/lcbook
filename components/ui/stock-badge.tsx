import type { HTMLAttributes } from "react";
import { Clock, Package, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Fulfilment state MUST be visible before payment, never discovered after (§15).
// Copy is driven only by the real available quantity — no invented scarcity (§15 item 3):
//   qty === 0        → made to order, 7–10 working days
//   1 ≤ qty ≤ 5      → truthful "Only N left" urgency
//   qty > 5          → in stock, 1–2 working days
export type StockTone = "in" | "low" | "pod";

interface StockStatus {
  tone: StockTone;
  Icon: LucideIcon;
  /** Compact form for catalogue ribbons. */
  short: string;
  /** Full form for the product / checkout badge. */
  long: string;
}

export function stockStatus(qty: number): StockStatus {
  if (qty <= 0) {
    return {
      tone: "pod",
      Icon: Clock,
      short: "Made to order",
      long: "Made to order · ships in 7–10 working days",
    };
  }
  if (qty <= 5) {
    return {
      tone: "low",
      Icon: Package,
      short: `Only ${qty} left`,
      long: `Only ${qty} left · ships in 1–2 working days`,
    };
  }
  return {
    tone: "in",
    Icon: Truck,
    short: "In stock",
    long: "In stock · ships in 1–2 working days",
  };
}

export const stockTone: Record<StockTone, string> = {
  in: "bg-[rgba(14,59,46,0.08)] text-lc-green-800",
  low: "bg-[rgba(232,163,61,0.20)] text-lc-on-gold ring-1 ring-inset ring-[rgba(232,163,61,0.5)]",
  pod: "bg-[rgba(14,59,46,0.06)] text-lc-green-400",
};

interface StockBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Live available quantity (stock minus soft reserves). */
  qty: number;
  size?: "sm" | "lg";
}

export function StockBadge({ qty, size = "sm", className, ...props }: StockBadgeProps) {
  const { tone, Icon, long } = stockStatus(qty);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        size === "lg" ? "px-4 py-1.5 text-[15px]" : "px-3 py-1 text-sm",
        stockTone[tone],
        className,
      )}
      {...props}
    >
      <Icon className={cn("shrink-0", size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />
      {long}
    </span>
  );
}
