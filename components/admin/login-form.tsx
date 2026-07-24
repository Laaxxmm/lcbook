"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/admin/action-form";

// Admin sign-in (§14): magic link only. Posts the email; the API emails a link ONLY if it's the
// configured ADMIN_EMAIL but always reports success generically so the admin address can't be
// probed. Mirrors the store login-form pattern.
export function AdminLoginForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <div className="mt-6 rounded-[12px] border border-lc-border bg-white p-4 text-[15px] text-lc-green-800">
        If that address is the admin, a single-use sign-in link is on its way. It expires in 15 minutes.
      </div>
    );
  }

  return (
    <form
      className="mt-6 grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
        if (!email) return setError("Enter your email.");
        setError(null);
        setBusy(true);
        try {
          const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
          });
          if (!res.ok) {
            setError("Enter a valid email.");
            setBusy(false);
            return;
          }
          setSent(true);
        } catch {
          setError("Something went wrong. Please try again.");
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="mb-1 block text-[13px] font-semibold text-lc-green-400" htmlFor="email">
          Admin email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputCls} />
      </div>
      {error && (
        <p role="alert" className="rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
