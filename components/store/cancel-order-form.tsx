"use client";

import { useState, type FormEvent } from "react";

// Customer cancellation REQUEST control (§6), shown on /track only while the order is still within
// its cancellation window. Posts the durable order token + an optional reason to /api/cancel. It
// never cancels or refunds directly — it files a request for admin review.
const inputCls =
  "w-full rounded-[10px] border border-lc-border bg-white px-3 py-2.5 text-[15px] text-lc-green-800 outline-none focus:border-lc-green-700 focus:ring-2 focus:ring-[rgba(14,59,46,0.15)]";

export function CancelOrderForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, reason: String(fd.get("reason") ?? "") }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Couldn't submit your request.");
        setBusy(false);
        return;
      }
      setDone(data.message ?? "Cancellation requested.");
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 rounded-[12px] border border-lc-border bg-[rgba(14,59,46,0.04)] p-4 text-[14px] text-lc-green-800">
        {done}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-[13px] font-semibold text-lc-green-700 underline underline-offset-4"
      >
        Need to cancel this order?
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-[12px] border border-lc-border bg-white p-4">
      <p className="text-[14px] text-lc-green-800">
        We&apos;ll review your request and email you. Cancellations are refunded minus payment
        gateway charges — nothing is refunded until an admin approves.
      </p>
      <textarea
        name="reason"
        rows={2}
        placeholder="Reason (optional)"
        className={`${inputCls} mt-3 resize-none`}
      />
      {error && (
        <p role="alert" className="mt-2 rounded-[10px] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-lc-gold px-4 py-2 text-[14px] font-bold text-lc-on-gold disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Request cancellation"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-4 py-2 text-[14px] font-semibold text-lc-green-400"
        >
          Keep my order
        </button>
      </div>
    </form>
  );
}
