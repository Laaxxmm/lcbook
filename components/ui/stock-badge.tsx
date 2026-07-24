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

// Bright, high-contrast fills so each state pops and is instantly distinguishable:
//   in  → vivid green (go / available)   low → vivid red (urgency)   pod → vivid amber (wait)
export const stockTone: Record<StockTone, string> = {
  in: "bg-[#16a34a] text-white",
  low: "bg-[#dc2626] text-white",
  pod: "bg-[#f59e0b] text-[#3A2A08]",
};

// Classic 45°-rotated crossed-corner ribbon, pinned top-right. Parent MUST be
// `relative overflow-hidden` so the tails clip into the corner. Shown ONLY when genuinely
// in stock (§15 — data-truthful). Bright green reads as "available" (conventional for in-stock).
export function CornerRibbon({ label = "In stock" }: { label?: string }) {
  return (
    <span className="pointer-events-none absolute right-[-52px] top-[26px] z-10 w-[180px] rotate-45 bg-[#16a34a] py-1 text-center text-[11px] font-extrabold uppercase tracking-wider text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
      {label}
    </span>
  );
}

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
