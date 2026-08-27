import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { Library, Truck, Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import "./globals.css";
import { env } from "@/lib/env";
import { SELLER } from "@/lib/invoice";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/store/brand-logo";
import { WhatsAppFab } from "@/components/store/whatsapp-fab";
import {
  HEADER_LINKS,
  FOOTER_PROGRAMS,
  FOOTER_TOOLS,
  FOOTER_STORE,
  type NavLink,
} from "@/config/learncrew";
import { siteUrl } from "@/app/_lib/seo";

const SITE_URL = siteUrl();

// Display-only short address (§16 UI polish). The full legal address stays in
// lib/invoice → SELLER.address is the full postal form for PDF/label; the site shows the
// single canonical SELLER.displayAddress everywhere (NAP consistency).

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
  // Fallback keeps `next build` from crashing when APP_URL isn't injected yet (build phase);
  // runtime uses the real APP_URL. Mirrors sitemap.ts / robots.ts.
  metadataBase: new URL(env.APP_URL || "https://publications.learncrew.org"),
  title: {
    default: "Learn Crew Publications — entrance-exam book sets",
    template: "%s · Learn Crew Publications",
  },
  description:
    "Physical book sets for PGCET, MAT, CAT and CLAT entrance prep. One price, shipping included, dispatched from Bengaluru.",
  robots: { index: true, follow: true },
  // og:image comes from app/opengraph-image.tsx (file convention) — Next merges it in.
  // NOTE: `openGraph` and `twitter` are REPLACED, not merged, by any child that defines them,
  // so every page that sets its own openGraph must restate siteName/url/type.
  openGraph: {
    type: "website",
    siteName: "Learn Crew Publications",
    url: SITE_URL,
    title: "Learn Crew Publications — entrance-exam book sets",
    description: "One price, shipping included. Dispatched from Bengaluru.",
  },
  // Without this WhatsApp/X render a shared link as a grey stub instead of the card.
  twitter: { card: "summary_large_image" },
};

const navLink =
  "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-[13px] font-semibold text-lc-green-400 transition-colors hover:bg-[rgba(14,59,46,0.06)] hover:text-lc-green-800 sm:px-[13px] sm:text-[13.5px]";

// Cross-site pill in the header row. Small + wrappable: the row can reflow freely because it
// sits BELOW the brand lockup, which is the part that must never wrap.
const crossLink =
  "inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[12px] font-semibold text-lc-green-400 transition-colors hover:bg-[rgba(14,59,46,0.06)] hover:text-lc-green-800 sm:text-[12.5px]";

const footerLink =
  "inline-flex items-center gap-1 text-lc-cream/75 transition-colors hover:text-lc-cream";

// External links get a plain <a>; internal ones stay on the router. `rel` is only ever set for
// internal links we don't want to pass authority to (/track).
function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-lc-gold">{title}</h2>
      <ul className="mt-3 space-y-2 text-[13.5px]">
        {links.map((l) => (
          <li key={l.href}>
            {l.href.startsWith("http") ? (
              <a href={l.href} className={footerLink}>
                {l.label}
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-lc-gold/70" aria-hidden />
              </a>
            ) : (
              <Link href={l.href} rel={l.rel} className={footerLink}>
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

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
              <Link href="/track" rel="nofollow" className={navLink}>
                <Truck className="h-4 w-4 shrink-0" aria-hidden />
                Track<span className="hidden sm:inline">&nbsp;order</span>
              </Link>
            </nav>
          </Container>
        </header>

        {/* Cross-site row — the way back to the parent brand. Deliberately its OWN row and
            NOT sticky: the sticky bar above is tuned to 60px with a lockup that must not wrap
            at 360px, and squeezing three more links into it would break both. Here the row is
            free to wrap (three pills ≈ 240px, so it stays on one line at 360px) and it costs
            the sticky chrome nothing — it simply scrolls away under the header. */}
        <div className="no-print border-b border-lc-border bg-[rgba(255,255,255,0.55)]">
          <Container className="flex flex-wrap items-center gap-x-1 gap-y-0.5 py-1.5">
            <span className="mr-1 hidden text-[11px] font-bold uppercase tracking-[0.12em] text-lc-green-400 sm:inline">
              More from Learn Crew
            </span>
            {HEADER_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={crossLink}>
                {l.label}
                <ArrowUpRight className="h-3 w-3 shrink-0 text-lc-gold" aria-hidden />
              </a>
            ))}
          </Container>
        </div>

        <main className="min-h-[60vh]">{children}</main>

        {/* Footer — seller block (§2) + policy links (§15). DISPLAY address only. */}
        <footer className="no-print mt-24 border-t border-lc-border bg-lc-green-800 text-lc-cream">
          <Container className="py-12">
            {/* One column below sm (everything stacks at 360px), two at sm, brand + three
                link columns at lg. */}
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-8">
              <div className="sm:col-span-2 lg:col-span-1">
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
                  <div className="flex items-start gap-2.5 text-sm leading-relaxed text-lc-cream/80">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lc-gold" aria-hidden />
                    <span>{SELLER.displayAddress}</span>
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

                {/* Cross-link back to the main site — live online classes live on learncrew.org. */}
                <a
                  href="https://learncrew.org"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-lc-gold/40 bg-lc-gold/10 px-4 py-2.5 text-[13.5px] font-bold text-lc-cream transition-colors hover:bg-lc-gold/20"
                >
                  Looking for live online classes? Visit learncrew.org
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-lc-gold" aria-hidden />
                </a>
              </div>

              {/* Three labelled columns replace the old single policy strip (P1-2) — the store
                  used to link back to the parent brand exactly once. */}
              <FooterColumn title="Programs" links={FOOTER_PROGRAMS} />
              <FooterColumn title="Free tools" links={FOOTER_TOOLS} />
              <FooterColumn title="Store" links={FOOTER_STORE} />
            </div>
          </Container>
        </footer>

        {/* Floating WhatsApp button — global, above the mobile sticky buy bar. */}
        <WhatsAppFab />
      </body>
    </html>
  );
}
