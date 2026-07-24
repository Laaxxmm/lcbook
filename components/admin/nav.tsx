"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/admin/(panel)/actions";

// Admin sub-nav (§14). Sits inside the store shell; gives the panel its own section chrome.
const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/print-queue", label: "Print queue" },
  { href: "/admin/cancellations", label: "Cancellations" },
  { href: "/admin/skus", label: "SKUs" },
  { href: "/admin/sheet-sync", label: "Sheet sync" },
  { href: "/admin/flagged", label: "Flagged" },
];

export function AdminNav({ adminEmail }: { adminEmail: string }) {
  const path = usePathname();
  const active = (l: (typeof LINKS)[number]) => (l.exact ? path === l.href : path.startsWith(l.href));

  return (
    <div className="no-print mb-8 border-b border-lc-border">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-lc-gold">Learn Crew · Admin</div>
        <div className="flex items-center gap-3 text-[13px] text-lc-green-400">
          <span className="hidden sm:inline">{adminEmail}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-[8px] px-2.5 py-1 font-semibold text-lc-green-700 hover:bg-[rgba(14,59,46,0.06)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="-mb-px flex flex-wrap gap-1">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-t-[10px] border-b-2 px-3 py-2 text-[14px] font-semibold",
              active(l)
                ? "border-lc-gold text-lc-green-800"
                : "border-transparent text-lc-green-400 hover:bg-[rgba(14,59,46,0.06)]",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
