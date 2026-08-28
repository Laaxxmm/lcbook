"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The buyer can land on /pay before the Razorpay webhook has confirmed the order, so the paid
 * check would miss the conversion by a second or two. Re-runs the server component a few times
 * so the conversion fires as soon as the order genuinely flips to paid, then stops. No polling
 * endpoint, so nothing new is exposed.
 */
export function ConfirmationPoller({ checks = 5, intervalMs = 3000 }: { checks?: number; intervalMs?: number }) {
  const router = useRouter();
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= checks) return;
    const t = setTimeout(() => {
      setDone((n) => n + 1);
      router.refresh();
    }, intervalMs);
    return () => clearTimeout(t);
  }, [done, checks, intervalMs, router]);

  return null;
}
