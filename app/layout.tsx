import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { Library, Truck, Mail, Phone, MapPin } from "lucide-react";
import "./globals.css";
import { env } from "@/lib/env";
import { SELLER } from "@/lib/invoice";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/store/brand-logo";
import { WhatsAppFab } from "@/components/store/whatsapp-fab";

// Display-only short address (§16 UI polish). The full legal address stays in
// lib/invoice → SELLER.address for PDF/email; this is the footer face only.
const DISPLAY_ADDRESS = "No. 57, Nandanam Layout, 10th Main, 9th Cross, Horamavu, Bengaluru–43";

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
  "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-[13px] font-semibold text-lc-green-400 transition-colors hover:bg-[rgba(14,59,46,0.06)] hover:text-lc-green-800 sm:px-[13px] sm:text-[13.5px]";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh bg-lc-cream font-sans text-lc-green-800 antialiased">
        {/* Announcement bar — one tidy line on mobile (§16). */}
        <div className="no-print bg-lc-green-900 text-lc-cream">
          <Container className="flex h-8 items-center justify-center gap-1.5 sm:h-9">
            <Truck className="h-3.5 w-3.5 shrink-0 text-lc-gold" aria-hidden />
            <span className="truncate text-[11.5px] font-medium tracking-tight sm:text-[13px]">
              Free shipping included · Dispatched from Bengaluru
            </span>
          </Container>
        </div>

        {/* Sticky nav — backdrop blur (§16). Logo mark + non-wrapping lockup. */}
        <header className="no-print sticky top-0 z-40 border-b border-lc-border bg-[rgba(250,247,242,0.9)] [backdrop-filter:saturate(160%)_blur(12px)]">
          <Container className="flex h-[60px] items-center justify-between gap-3 sm:h-[72px] sm:gap-4">
            <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-2.5">
              <BrandLogo
                src="/logo-mark.png"
                alt="Learn Crew Publications"
                className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-1 ring-1 ring-lc-border sm:h-10 sm:w-10"
              />
              <span className="flex flex-col whitespace-nowrap leading-[1.05]">
                <span className="text-[13.5px] font-extrabold tracking-[-0.01em] text-lc-green-800 sm:text-[15px]">
                  Learn Crew
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-lc-gold sm:text-[10px]">
                  Publications
                </span>
              </span>
            </Link>
            <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <Link href="/" className={navLink}>
                <Library className="h-4 w-4 shrink-0" aria-hidden />
                Catalogue
              </Link>
              <Link href="/track" className={navLink}>
                <Truck className="h-4 w-4 shrink-0" aria-hidden />
                Track<span className="hidden sm:inline">&nbsp;order</span>
              </Link>
            </nav>
          </Container>
        </header>

        <main className="min-h-[60vh]">{children}</main>

        {/* Footer — seller block (§2) + policy links (§15). DISPLAY address only. */}
        <footer className="no-print mt-24 border-t border-lc-border bg-lc-green-800 text-lc-cream">
          <Container className="py-12">
            {/* Brand lockup — mascot mark + cream wordmark, mirroring the header. */}
            <div className="flex items-center gap-2.5">
              <BrandLogo
                src="/logo-mark.png"
                alt="Learn Crew Publications"
                className="h-8 w-8 shrink-0 rounded-lg object-contain"
              />
              <span className="flex flex-col leading-[1.02]">
                <span className="text-[17px] font-extrabold tracking-[-0.01em] text-lc-cream">
                  Learn Crew
                </span>
                <span className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-lc-gold">
                  Publications
                </span>
              </span>
            </div>

            <div className="mt-5 max-w-md">
              <div className="text-[15px] font-bold tracking-tight">{SELLER.name}</div>

              <div className="mt-3 flex items-start gap-2.5 text-sm leading-relaxed text-lc-cream/80">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lc-gold" aria-hidden />
                <span>{DISPLAY_ADDRESS}</span>
              </div>

              <a
                href={`mailto:${SELLER.email}`}
                className="mt-4 inline-flex items-center gap-2.5 text-sm text-lc-cream/85 transition-colors hover:text-lc-cream"
              >
                <Mail className="h-4 w-4 shrink-0 text-lc-gold" aria-hidden />
                {SELLER.email}
              </a>

              {/* Phone sits BELOW email and is visually louder (§16 item 2). */}
              <a
                href={`tel:${SELLER.phone.replace(/\s/g, "")}`}
                className="mt-3 flex w-fit items-center gap-2.5 text-[17px] font-extrabold tracking-tight text-lc-cream transition-opacity hover:opacity-90"
              >
                <Phone className="h-[18px] w-[18px] shrink-0 text-lc-gold" aria-hidden />
                {SELLER.phone}
              </a>
            </div>

            {/* Policy links — horizontal strip along the bottom, wraps on mobile. */}
            <nav className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-lc-cream/15 pt-6 text-[13px]">
              {POLICY_LINKS.map((l, i) => (
                <span key={l.href} className="inline-flex items-center gap-2">
                  {i > 0 && <span className="text-lc-cream/30" aria-hidden>·</span>}
                  <Link href={l.href} className="text-lc-cream/75 transition-colors hover:text-lc-cream">
                    {l.label}
                  </Link>
                </span>
              ))}
            </nav>
          </Container>
        </footer>

        {/* Floating WhatsApp button — global, above the mobile sticky buy bar. */}
        <WhatsAppFab />
      </body>
    </html>
  );
}
