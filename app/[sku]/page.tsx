import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, MessageCircle, Truck, Check, Package } from "lucide-react";
import { prisma } from "@/lib/db";
import { availableStock } from "@/lib/inventory";
import { Container } from "@/components/ui/container";
import { Price } from "@/components/ui/price";
import { StockBadge, stockStatus, CornerRibbon } from "@/components/ui/stock-badge";
import { ProductUpsell } from "@/components/store/product-upsell";
import { ProductPurchase } from "@/components/store/product-purchase";
import { examBadge } from "@/app/_lib/sku-view";

// POD (stock 0) allows a small bulk order; in-stock is capped at real availability. Both stay
// within the checkout API's sanity ceiling. The frozen core still prevents oversell at CONFIRMED.
const POD_MAX_QTY = 10;

// Product page (§15). SSR for live availability + SEO; rendered on demand so `next build`
// needs no database. Fulfilment state (in-stock vs print-to-order) is shown BEFORE payment —
// they are different products from the buyer's side (1–2 days vs 7–10, cancellable vs not).
export const dynamic = "force-dynamic";

const WHATSAPP = "https://wa.me/919738255304";

async function getSku(code: string) {
  const sku = await prisma.sku.findUnique({ where: { code } });
  return sku && sku.active ? sku : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sku: string }>;
}): Promise<Metadata> {
  const { sku: code } = await params;
  const sku = await getSku(code);
  if (!sku) return { title: "Set not found" };
  const price = `₹${(sku.pricePaise / 100).toLocaleString("en-IN")}`;
  return {
    title: sku.name,
    description: `${sku.name} — ${sku.bookCount} books, ${price} with shipping included. Dispatched from Bengaluru.`,
    alternates: { canonical: `/${sku.code}` },
    openGraph: { title: sku.name, description: `${sku.bookCount}-book set · ${price} shipping included.` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku: code } = await params;
  const sku = await getSku(code);
  if (!sku) notFound();

  const qty = await availableStock(prisma, sku.code);
  const inStock = qty > 0;
  // Corner ribbon + max quantity are both driven only by real availability (§15, data-truthful).
  const showRibbon = stockStatus(qty).tone === "in";
  const maxQty = inStock ? qty : POD_MAX_QTY;
  const cancellationLine = inStock
    ? "Cancel any time before dispatch — refunded minus payment-gateway charges."
    : "Cancel until printing starts — refunded minus gateway charges; not cancellable once printing begins.";

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        {/* Hero — relative + overflow-hidden so the in-stock corner ribbon clips at the corner. */}
        <div className="relative overflow-hidden">
          {showRibbon && <CornerRibbon />}
          {/* 1. Exam badge + format (Hardcopy) + set name */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-[rgba(14,59,46,0.06)] px-3 py-1 text-[12px] font-bold text-lc-green-700">
              {examBadge(sku.code)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-lc-border bg-white px-3 py-1 text-[12px] font-bold text-lc-green-700">
              <Package className="h-3.5 w-3.5" aria-hidden />
              Hardcopy
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-lc-green-800 sm:text-3xl">
            {sku.name}
          </h1>

          {/* 2. Price + shipping included */}
          <div className="mt-4">
            <Price paise={sku.pricePaise} />
          </div>

          {/* 3. Stock state + delivery window — quantity-driven. When the ribbon shows it already
              says "In stock", so drop the redundant badge and keep only the delivery window. */}
          <div className="mt-3">
            {showRibbon ? (
              <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-lc-green-700">
                <Truck className="h-4 w-4 shrink-0" aria-hidden />
                Ships in 1–2 working days
              </span>
            ) : (
              <StockBadge qty={qty} size="lg" />
            )}
          </div>
        </div>

        {/* 4. Quantity + buy (inline desktop CTA + mobile sticky bar) */}
        <ProductPurchase code={sku.code} unitPricePaise={sku.pricePaise} maxQty={maxQty} />

        {/* 5. Cancellation terms — one short line, not a buried link */}
        <p className="mt-4 text-[13px] text-lc-green-400">{cancellationLine}</p>

        {/* 6. What's inside */}
        <section className="mt-8" aria-labelledby="whats-inside">
          <h2 id="whats-inside" className="text-[15px] font-bold text-lc-green-800">
            What&apos;s inside · {sku.bookCount} books
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            {sku.titles.map((t) => (
              <li
                key={t}
                className="flex items-start gap-2.5 rounded-[10px] border border-lc-border bg-white px-4 py-3 text-[14px] leading-snug text-lc-green-800 transition-colors hover:border-[rgba(232,163,61,0.5)]"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-lc-gold" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-lc-green-400">All books A4 size.</p>
        </section>

        {/* 7. Ebook / course upsell — below the primary action, missing rows hidden */}
        <ProductUpsell sku={sku} />

        {/* 8. Trust strip */}
        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-lc-border pt-5 text-[13px] text-lc-green-400">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 text-lc-green-700" aria-hidden />
            Dispatched from Bengaluru
          </span>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-lc-green-700 hover:underline underline-offset-4"
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
            WhatsApp us
          </a>
          <Link
            href="/track"
            className="inline-flex items-center gap-1.5 font-semibold text-lc-green-700 hover:underline underline-offset-4"
          >
            <Truck className="h-4 w-4 shrink-0" aria-hidden />
            Track your order
          </Link>
        </div>
      </div>
    </Container>
  );
}
