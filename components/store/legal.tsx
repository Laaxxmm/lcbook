import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

// Shared shell for the four policy pages (§15). Kept plain and readable — Razorpay reviews
// these before approving the MID, so the copy must be publicly reachable and unambiguous.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-lc-green-800">{title}</h1>
        <p className="mt-2 text-[13px] text-lc-green-400">Last updated {updated}</p>
        <div className="lc-prose mt-6 space-y-4 text-[15px] leading-relaxed text-lc-green-800">
          {children}
        </div>
      </div>
    </Container>
  );
}

// Small typographic helpers so each policy page stays copy, not markup.
export function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-2 text-lg font-bold text-lc-green-800">{children}</h2>;
}
export function P({ children }: { children: ReactNode }) {
  return <p className="text-lc-green-400">{children}</p>;
}
export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5 text-lc-green-400">{children}</ul>;
}
