"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { CONSENT_TEXT } from "@/app/_lib/consent";

// Guest checkout address form (§8). Mobile: single column, numeric keypad on pincode + phone,
// sticky thumb-reachable buy button. Marketing consent DEFAULT UNTICKED (DPDP). On submit it
// calls /api/checkout (server creates the local + Razorpay order), then opens Razorpay Standard
// Checkout (full-screen on mobile). The callback signature is verified server-side; the
// authoritative order state still comes from the webhook, so we only redirect the UI.

interface CheckoutFormProps {
  skuCode: string;
  setName: string;
  amountPaise: number;
}

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
}
interface RazorpayCtor {
  new (options: Record<string, unknown>): RazorpayInstance;
}
declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

const CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = CHECKOUT_JS;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const inputCls =
  "w-full rounded-[10px] border border-lc-border bg-white px-3 py-2.5 text-[15px] text-lc-green-800 outline-none focus:border-lc-green-700 focus:ring-2 focus:ring-[rgba(14,59,46,0.15)]";
const labelCls = "mb-1 block text-[13px] font-semibold text-lc-green-400";

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CheckoutForm({ skuCode, setName, amountPaise }: CheckoutFormProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "").trim();

    const payload = {
      skuCode,
      qty: 1,
      customer: { name: g("name"), email: g("email"), phone: g("phone") },
      address: {
        line1: g("line1"),
        line2: g("line2") || undefined,
        city: g("city"),
        state: g("state"),
        pincode: g("pincode"),
      },
      marketingConsent: fd.get("marketingConsent") === "on",
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
        setBusy(false);
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setError("Couldn't reach the payment gateway. Check your connection and retry.");
        setBusy(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amountPaise,
        currency: "INR",
        name: "Learn Crew Publications",
        description: setName,
        prefill: { name: payload.customer.name, email: payload.customer.email, contact: payload.customer.phone },
        theme: { color: "#0E3B2E" },
        handler: async (r: RazorpayHandlerResponse) => {
          let ok = false;
          try {
            const v = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(r),
            });
            ok = (await v.json()).ok === true;
          } catch {
            ok = false;
          }
          window.location.href = `/pay?order=${encodeURIComponent(data.orderId)}&status=${ok ? "success" : "failed"}`;
        },
        modal: {
          ondismiss: () => {
            window.location.href = `/pay?order=${encodeURIComponent(data.orderId)}&status=cancelled`;
          },
        },
      });
      rzp.open();
      // Leave busy=true: Razorpay is now full-screen; the handler/dismiss navigates away.
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="pb-28">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className={labelCls} htmlFor="name">Full name</label>
          <input id="name" name="name" required autoComplete="name" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            required
            inputMode="numeric"
            autoComplete="tel"
            pattern="\d{10,15}"
            placeholder="10-digit mobile"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="line1">Address line 1</label>
          <input id="line1" name="line1" required autoComplete="address-line1" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="line2">Address line 2 (optional)</label>
          <input id="line2" name="line2" autoComplete="address-line2" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="city">City</label>
            <input id="city" name="city" required autoComplete="address-level2" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="state">State</label>
            <input id="state" name="state" required autoComplete="address-level1" className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="pincode">PIN code</label>
          <input
            id="pincode"
            name="pincode"
            required
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="\d{6}"
            placeholder="6-digit PIN"
            className="w-40 rounded-[10px] border border-lc-border bg-white px-3 py-2.5 text-[15px] text-lc-green-800 outline-none focus:border-lc-green-700 focus:ring-2 focus:ring-[rgba(14,59,46,0.15)]"
          />
        </div>

        {/* Consent — DEFAULT UNTICKED (§8 DPDP). A pre-ticked box is not valid consent. */}
        <label className="flex items-start gap-3 rounded-[12px] border border-lc-border bg-white p-3 text-[13px] text-lc-green-400">
          <input type="checkbox" name="marketingConsent" className="mt-0.5 h-4 w-4 shrink-0 accent-lc-green-800" />
          <span>{CONSENT_TEXT}</span>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-[10px] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Sticky thumb-reachable buy button (§8). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-lc-border bg-[rgba(250,247,242,0.95)] [backdrop-filter:blur(8px)]">
        <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-6 py-3">
          <div className="text-sm">
            <div className="font-extrabold text-lc-green-800">{rupees(amountPaise)}</div>
            <div className="text-[12px] text-lc-green-400">shipping included</div>
          </div>
          <Button type="submit" disabled={busy} className="min-w-[160px]">
            {busy ? "Opening payment…" : "Pay securely"}
          </Button>
        </div>
      </div>
    </form>
  );
}
