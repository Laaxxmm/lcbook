"use client";

import { Button } from "@/components/ui/button";

// Panel error boundary — a failed transition/refund (e.g. lost a race) surfaces here instead of
// a white screen. reset() re-runs the segment with fresh server data.
export default function PanelError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-[14px] border border-lc-border bg-white p-6">
      <h2 className="text-lg font-bold text-lc-green-800">Something went wrong</h2>
      <p className="mt-2 text-[14px] text-lc-green-400">{error.message || "Unexpected error."}</p>
      <div className="mt-4">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
