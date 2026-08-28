"use client";

import { useEffect } from "react";
import { GOOGLE_ADS_ID } from "./google-ads";

// The conversion action created in Google Ads for a completed store purchase.
const SEND_TO = `${GOOGLE_ADS_ID}/MUx3CNzGn-kcEKin_rIB`;

type DataLayerWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

/**
 * Fires the Google Ads purchase conversion exactly once for a real, paid order.
 *
 * Rendered ONLY by /pay, and only after the server has confirmed against Postgres that the
 * order actually reached a paid status — never from the ?status=success query param, which
 * the client controls and which is set before the Razorpay webhook has confirmed anything.
 *
 * `value` is the order total in rupees as a number (shipping included — every price on this
 * store is inclusive), so Smart Bidding can tell a Rs 9,000 CLAT set from a Rs 399 mock.
 * `transaction_id` is our own order id, which is also how Google de-duplicates a conversion
 * that arrives twice from different browsers.
 */
export function PurchaseConversion({
  orderId,
  valueRupees,
}: {
  orderId: string;
  valueRupees: number;
}) {
  useEffect(() => {
    const key = `lc_ads_conv_${orderId}`;
    // Refresh / back-navigation guard. Storage can throw (private mode, blocked cookies), and a
    // conversion is worth more than the guard, so a throw falls through to firing.
    try {
      if (window.localStorage.getItem(key)) return;
    } catch {
      /* storage unavailable — fall through */
    }

    const w = window as DataLayerWindow;
    // gtag.js is afterInteractive and may not have executed yet. The standard snippet queues
    // into dataLayer, so define the shim if it is missing rather than dropping the conversion.
    if (typeof w.gtag !== "function") {
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag(...args: unknown[]) {
        (w.dataLayer as unknown[]).push(args);
      };
    }

    w.gtag("event", "conversion", {
      send_to: SEND_TO,
      value: valueRupees,
      currency: "INR",
      transaction_id: orderId,
    });

    try {
      window.localStorage.setItem(key, "1");
    } catch {
      /* storage unavailable — Google still de-dupes on transaction_id */
    }
  }, [orderId, valueRupees]);

  return null;
}
