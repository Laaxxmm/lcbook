import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { env } from "@/lib/env";
import { SELLER } from "@/lib/invoice";
import { Container } from "@/components/ui/container";

// Self-hosted variable font (§16). subsets MUST include latin-ext: the rupee sign
// ₹ (U+20B9) lives in latin-ext (range U+20AD–20C0), NOT the base `latin` subset —
// omit it and every price falls back to system-ui mid-string.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--lc-font",
});

// This store replaces an indexed WordPress site — SEO defaults matter (§15, §16).
export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: "Learn Crew Publications — entrance-exam book sets",
    template: "%s · Learn Crew Publications",
  },
  description:
    "Physical book sets for PGCET, MAT, CAT and CLAT entrance prep. One price, shipping included, dispatched from Bengaluru.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Learn Crew Publications",
    title: "Learn Crew Publications — entrance-exam book sets",
    description: "One price, shipping included. Dispatched from Bengaluru.",
  },
};

// Policy pages are Razorpay-gated (§15, §17) and owned by the public-pages agent.
const POLICY_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refund & Cancellation" },
  { href: "/shipping-policy", label: "Shipping" },
  { href: "/contact", label: "Contact" },
];

const navLink =
  "rounded-[10px] px-[13px] py-[9px] text-[14.5px] font-semibold text-lc-green-400 hover:bg-[rgba(14,59,46,0.06)]";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh bg-lc-cream font-sans text-lc-green-800 antialiased">
        {/* Announcement bar — brand promise, no hidden "call to know" (§16). */}
        <div className="bg-lc-green-900 text-[13px] text-lc-cream">
          <Container className="flex h-9 items-center justify-center text-center">
            Every price includes shipping. Dispatched from Bengaluru.
          </Container>
        </div>

        {/* Sticky nav, 72px, backdrop blur (§16). */}
        <header className="sticky top-0 z-40 border-b border-lc-border bg-[rgba(250,247,242,0.9)] [backdrop-filter:saturate(160%)_blur(12px)]">
          <Container className="flex h-[72px] items-center justify-between">
            <Link
              href="/"
              className="text-[20px] font-extrabold tracking-[-0.02em] text-lc-green-800"
            >
              Learn Crew <span className="text-lc-gold">Publications</span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/" className={navLink}>
                Catalogue
              </Link>
              <Link href="/track" className={navLink}>
                Track order
              </Link>
            </nav>
          </Container>
        </header>

        <main className="min-h-[60vh]">{children}</main>

        {/* Footer — seller block (§2) + policy links (§15). */}
        <footer className="mt-24 border-t border-lc-border bg-lc-green-800 text-lc-cream">
          <Container className="grid gap-8 py-12 sm:grid-cols-2">
            <div className="text-sm leading-relaxed">
              <div className="font-bold">{SELLER.name}</div>
              {SELLER.address.map((line) => (
                <div key={line} className="text-lc-cream/80">
                  {line}
                </div>
              ))}
              <div className="mt-2">
                <a href={`mailto:${SELLER.email}`} className="underline">
                  {SELLER.email}
                </a>
                {" · "}
                <a href={`tel:${SELLER.phone.replace(/\s/g, "")}`}>{SELLER.phone}</a>
              </div>
            </div>
            <nav className="flex flex-col gap-2 text-sm sm:items-end">
              {POLICY_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="text-lc-cream/80 hover:text-lc-cream">
                  {l.label}
                </Link>
              ))}
            </nav>
          </Container>
        </footer>
      </body>
    </html>
  );
}
