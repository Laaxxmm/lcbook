"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

// Order-id + phone lookup form (§8). Posts to /api/track, which verifies the phone against the
// order before minting a signed durable token and redirecting — so a bare order id never
// reveals anything. Pre-fills the order id from the confirmation email's ?order= link.
const inputCls =
  "w-full rounded-[10px] border border-lc-border bg-white px-3 py-2.5 text-[15px] text-lc-green-800 outline-none focus:border-lc-green-700 focus:ring-2 focus:ring-[rgba(14,59,46,0.15)]";
const labelCls = "mb-1 block text-[13px] font-semibold text-lc-green-400";

export function TrackLookup({ defaultOrderId = "" }: { defaultOrderId?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: String(fd.get("orderId") ?? ""), phone: String(fd.get("phone") ?? "") }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "No order found.");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4">
      <div>
        <label className={labelCls} htmlFor="orderId">Order ID</label>
        <input
          id="orderId"
          name="orderId"
          required
          defaultValue={defaultOrderId}
          placeholder="LC-2627-000431"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="phone">Phone on the order</label>
        <input id="phone" name="phone" required inputMode="numeric" autoComplete="tel" className={inputCls} />
      </div>
      {error && (
        <p role="alert" className="rounded-[10px] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>{busy ? "Looking up…" : "Find my order"}</Button>
    </form>
  );
}
