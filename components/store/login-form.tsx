"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Returning-customer sign-in (§8): magic link (primary) or 6-digit email OTP. No SMS, no
// passwords. Requesting a link/code always reports success generically (the API won't reveal
// whether an account exists). OTP flow forwards to /login/verify to enter the code.
const inputCls =
  "w-full rounded-[10px] border border-lc-border bg-white px-3 py-2.5 text-[15px] text-lc-green-800 outline-none focus:border-lc-green-700 focus:ring-2 focus:ring-[rgba(14,59,46,0.15)]";

export function LoginForm({ next }: { next?: string }) {
  const [busy, setBusy] = useState<null | "magic" | "otp">(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(method: "magic" | "otp", email: string) {
    if (!email) {
      setError("Enter your email.");
      return;
    }
    setError(null);
    setBusy(method);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, method }),
      });
      if (!res.ok) {
        setError("Enter a valid email.");
        setBusy(null);
        return;
      }
      if (method === "otp") {
        const q = new URLSearchParams({ email });
        if (next) q.set("next", next);
        window.location.href = `/login/verify?${q.toString()}`;
        return;
      }
      setSent(true);
      setBusy(null);
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-[12px] border border-lc-border bg-white p-4 text-[15px] text-lc-green-800">
        If that email has orders with us, a sign-in link is on its way. It expires in 15 minutes.
      </div>
    );
  }

  return (
    <form
      className="mt-6 grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit("magic", String(new FormData(e.currentTarget).get("email") ?? "").trim());
      }}
    >
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-lc-green-400" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
      </div>
      {error && (
        <p role="alert" className="rounded-[10px] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy !== null}>
        {busy === "magic" ? "Sending…" : "Email me a sign-in link"}
      </Button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={(e) => {
          const email = String(
            new FormData(e.currentTarget.closest("form") as HTMLFormElement).get("email") ?? "",
          ).trim();
          submit("otp", email);
        }}
        className="text-sm font-semibold text-lc-green-700 underline underline-offset-4 disabled:opacity-50"
      >
        Prefer a 6-digit code instead?
      </button>
    </form>
  );
}
