"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

// 6-digit OTP entry (§8). Posts email + code to /api/auth/verify, which single-use-consumes
// the code, sets the session cookie, and returns the URL to land on.
export function OtpForm({ email, next }: { email: string; next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const code = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code, next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "That code is invalid or expired.");
        setBusy(false);
        return;
      }
      window.location.href = data.url ?? "/track";
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4">
      <p className="text-[15px] text-lc-green-400">
        We emailed a 6-digit code to <span className="font-semibold text-lc-green-800">{email}</span>. It expires in 15 minutes.
      </p>
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-lc-green-400" htmlFor="code">Login code</label>
        <input
          id="code"
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          className="w-44 rounded-[10px] border border-lc-border bg-white px-3 py-2.5 text-center text-[22px] font-bold tracking-[0.3em] text-lc-green-800 outline-none focus:border-lc-green-700 focus:ring-2 focus:ring-[rgba(14,59,46,0.15)]"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-[10px] bg-[rgba(220,38,38,0.08)] px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify & continue"}</Button>
    </form>
  );
}
