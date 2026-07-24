"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { formatRupees } from "@/lib/money";

// Product-page purchase controls (§15). Picks a quantity (clamped to maxQty), shows the live
// line total (unit × qty), and carries the chosen qty to checkout via ?qty=. Renders both the
// desktop inline CTA and the mobile sticky buy bar so one qty state drives both.
export function ProductPurchase({
  code,
  unitPricePaise,
  maxQty,
}: {
  code: string;
  unitPricePaise: number;
  maxQty: number;
}) {
  const [qty, setQty] = useState(1);
  const total = unitPricePaise * qty;
  const href = `/${code}/checkout?qty=${qty}`;
  const cta = qty > 1 ? `Buy ${qty} sets` : "Buy this set";

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} onChange={setQty} min={1} max={maxQty} />
        <span className="text-[13px] text-lc-green-400">
          {qty > 1 ? (
            <>
              Total <strong className="text-lc-green-800">{formatRupees(total)}</strong> for {qty} sets
            </>
          ) : (
            "Choose quantity"
          )}
        </span>
      </div>

      <div className="mt-4 hidden sm:block">
        <Button asChild size="xl">
          <Link href={href}>{cta}</Link>
        </Button>
      </div>

      {/* Sticky thumb-reachable buy bar on mobile (§16 item 5). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-lc-border bg-[rgba(250,247,242,0.95)] [backdrop-filter:blur(8px)] [box-shadow:0_-6px_20px_rgba(14,59,46,0.08)] sm:hidden">
        <div className="mx-auto flex max-w-container items-center gap-4 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="shrink-0 leading-tight">
            <div className="text-[19px] font-extrabold tracking-tight text-lc-green-800">{formatRupees(total)}</div>
            <div className="text-[11px] text-lc-green-400">
              {qty > 1 ? `${qty} sets · shipping included` : "shipping included"}
            </div>
          </div>
          <Button asChild size="xl" className="flex-1">
            <Link href={href}>{cta}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
