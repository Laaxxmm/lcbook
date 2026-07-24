"use client";

import { Minus, Plus } from "lucide-react";

// Accessible, mobile-friendly quantity stepper: −/＋ buttons plus a numeric input, all clamped
// to [min, max]. Max is the caller's real ceiling (available stock for in-stock, POD cap for
// print-to-order) so the UI can never offer more than is allowed.
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  id = "qty",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max: number;
  id?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const btn =
    "grid h-11 w-11 shrink-0 place-items-center text-lc-green-800 transition-colors hover:bg-[rgba(14,59,46,0.06)] disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="inline-flex items-center overflow-hidden rounded-[10px] border border-lc-border bg-white">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className={btn}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <input
        id={id}
        inputMode="numeric"
        pattern="\d*"
        aria-label="Quantity"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isNaN(n) ? min : clamp(n));
        }}
        className="h-11 w-12 border-x border-lc-border bg-transparent text-center text-[15px] font-bold text-lc-green-800 outline-none"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className={btn}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
