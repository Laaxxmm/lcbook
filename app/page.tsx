import Link from "next/link";
import type { Sku } from "@prisma/client";
import { ArrowRight, BookOpen, BookText, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { Price } from "@/components/ui/price";
import { Container } from "@/components/ui/container";
import { stockStatus, stockTone, CornerRibbon } from "@/components/ui/stock-badge";
import { examBadge } from "@/app/_lib/sku-view";
import { DIGITAL, effectiveEbookPaise } from "@/app/_lib/digital";
import { effectiveEbookUrl, elearningUtm } from "@/config/elearning";
import type { SkuCode } from "@/lib/catalogue";

// Catalogue home (§15). SSR so live prices/availability show and this indexed URL keeps its
// SEO (§1) — rendered on demand, so `next build` never needs a database. Two tabs let the
// buyer pick the FORMAT up front — no Hardcopy/eBook confusion:
//   - Hardcopy → the printed sets, bought here (guest checkout).
//   - eBook    → digital, sold on WiseApp — DISPLAY + REDIRECT ONLY (§3/§18). No cart here.
// Tabs are plain links (?tab=) so they stay server-rendered and crawlable.
export const dynamic = "force-dynamic";

const TABS = [
  { key: "hardcopy", label: "Hardcopy", href: "/", Icon: Package },
  { key: "ebook", label: "eBook", href: "/?tab=ebook", Icon: BookText },
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active = tab === "ebook" ? "ebook" : "hardcopy";
  const skus = await prisma.sku.findMany({ where: { active: true }, orderBy: { pricePaise: "asc" } });

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-lc-green-400">
          Learn Crew Publications
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-lc-green-800 sm:text-4xl">
          Entrance-exam prep for PGCET, MAT, CAT &amp; CLAT
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-lc-green-400">
          Pick your format — printed <strong>Hardcopy</strong> sets delivered from Bengaluru, or the
          digital <strong>eBook</strong>. One clear price, no hidden &ldquo;call to know.&rdquo;
        </p>
      </header>

      {/* Format tabs (§ — buyer picks Hardcopy vs eBook up front). */}
      <div className="mt-8 inline-flex rounded-full border border-lc-border bg-white p-1">
        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-bold transition-colors ${
                on
                  ? "bg-lc-green-800 text-lc-cream"
                  : "text-lc-green-400 hover:text-lc-green-800"
              }`}
            >
              <t.Icon className="h-4 w-4 shrink-0" aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </div>

      {active === "hardcopy" ? <HardcopyGrid skus={skus} /> : <EbookGrid skus={skus} />}
    </Container>
  );
}

function HardcopyGrid({ skus }: { skus: Sku[] }) {
  if (skus.length === 0) {
    return <p className="mt-8 text-lc-green-400">The catalogue is being updated. Please check back soon.</p>;
  }
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {skus.map((sku) => {
        const stock = stockStatus(sku.stockQty);
        const StockIcon = stock.Icon;
        // Corner ribbon replaces the redundant "In stock" pill; the pill is kept for the
        // "Only N left" / "Made to order" states (§15, data-truthful — ribbon only when in stock).
        const showRibbon = stock.tone === "in";
        return (
          <Link
            key={sku.code}
            href={`/${sku.code}`}
            className="group relative flex flex-col overflow-hidden rounded-[14px] border border-lc-border bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(232,163,61,0.5)] hover:shadow-[0_12px_28px_rgba(14,59,46,0.1)]"
          >
            {/* Gold hairline that wipes in on hover — restrained accent. */}
            <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-lc-gold transition-transform duration-300 group-hover:scale-x-100" />
            {showRibbon && <CornerRibbon />}
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex w-fit rounded-full bg-[rgba(14,59,46,0.06)] px-3 py-1 text-[12px] font-bold text-lc-green-700">
                {examBadge(sku.code)}
              </span>
              {/* Edge pill — copy driven only by real stockQty. Hidden when the ribbon shows. */}
              {!showRibbon && (
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${stockTone[stock.tone]}`}
                >
                  <StockIcon className="h-3 w-3 shrink-0" aria-hidden />
                  {stock.short}
                </span>
              )}
            </div>
            <h2 className="mt-3 text-lg font-bold text-lc-green-800">{sku.name}</h2>
            <p className="mt-1 flex items-start gap-1.5 text-[13px] text-lc-green-400">
              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {sku.bookCount} books · {sku.titles.slice(0, 4).join(", ")}
                {sku.titles.length > 4 ? "…" : ""}
              </span>
            </p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <Price paise={sku.pricePaise} shippingIncluded={false} />
                <p className="mt-0.5 text-[12px] font-medium text-lc-green-400">shipping included</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-lc-border bg-lc-cream px-4 py-2 text-[13px] font-bold text-lc-green-800 transition-colors group-hover:border-lc-gold group-hover:bg-lc-gold group-hover:text-lc-on-gold">
                View set
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function EbookGrid({ skus }: { skus: Sku[] }) {
  // §3: display + redirect only, and a MISSING URL hides that item entirely (no dead links,
  // no price with no destination). Only SKUs with an effective eBook URL appear here.
  const items = skus
    .map((s) => ({ sku: s, href: effectiveEbookUrl(s) }))
    .filter((x): x is { sku: Sku; href: string } => Boolean(x.href));
  const utm = elearningUtm();

  if (items.length === 0) {
    return (
      <p className="mt-8 text-[15px] text-lc-green-400">
        eBooks are being published on our learning platform. Please check back soon.
      </p>
    );
  }

  return (
    <>
      <p className="mt-6 text-[13px] text-lc-green-400">
        eBooks open on our learning platform (1-year access). Digital products are{" "}
        <strong>non-refundable</strong>, and a Hardcopy set doesn&apos;t include digital access.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ sku, href }) => {
          const d = DIGITAL[sku.code as SkuCode];
          return (
            <a
              key={sku.code}
              href={href + utm}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col overflow-hidden rounded-[14px] border border-lc-border bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(232,163,61,0.5)] hover:shadow-[0_12px_28px_rgba(14,59,46,0.1)]"
            >
              <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-lc-gold transition-transform duration-300 group-hover:scale-x-100" />
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex w-fit rounded-full bg-[rgba(14,59,46,0.06)] px-3 py-1 text-[12px] font-bold text-lc-green-700">
                  {examBadge(sku.code)}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgba(232,163,61,0.16)] px-2.5 py-1 text-[11.5px] font-bold text-lc-green-800">
                  <BookText className="h-3 w-3 shrink-0" aria-hidden />
                  eBook
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-lc-green-800">{sku.name}</h2>
              <p className="mt-1 text-[13px] text-lc-green-400">{d.ebookLabel}</p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <Price paise={effectiveEbookPaise(sku)} shippingIncluded={false} />
                  <p className="mt-0.5 text-[12px] font-medium text-lc-green-400">1-year access</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-lc-border bg-lc-cream px-4 py-2 text-[13px] font-bold text-lc-green-800 transition-colors group-hover:border-lc-gold group-hover:bg-lc-gold group-hover:text-lc-on-gold">
                  Get eBook
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
