import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { availableStock } from "@/lib/inventory";
import type { SkuCode } from "@/lib/catalogue";
import { Container } from "@/components/ui/container";
import { Price } from "@/components/ui/price";
import { StockBadge } from "@/components/ui/stock-badge";
import { Button } from "@/components/ui/button";
import { ProductUpsell } from "@/components/store/product-upsell";
import { examBadge } from "@/app/_lib/sku-view";

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

  const inStock = (await availableStock(prisma, sku.code)) > 0;
  const cancellationLine = inStock
    ? "Cancel any time before dispatch — refunded minus payment-gateway charges."
    : "Cancel until printing starts — refunded minus gateway charges; not cancellable once printing begins.";

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        {/* 1. Exam badge + set name */}
        <span className="inline-flex rounded-full bg-[rgba(14,59,46,0.06)] px-3 py-1 text-[12px] font-bold text-lc-green-700">
          {examBadge(sku.code)}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-lc-green-800 sm:text-3xl">
          {sku.name}
        </h1>

        {/* 2. Price + shipping included */}
        <div className="mt-4">
          <Price paise={sku.pricePaise} />
        </div>

        {/* 3. Stock state + delivery window */}
        <div className="mt-3">
          <StockBadge inStock={inStock} />
        </div>

        {/* 4. Buy button (inline; sticky bar below on mobile) */}
        <div className="mt-5 hidden sm:block">
          <Button asChild size="lg">
            <Link href={`/${sku.code}/checkout`}>Buy this set</Link>
          </Button>
        </div>

        {/* 5. Cancellation terms — one short line, not a buried link */}
        <p className="mt-4 text-[13px] text-lc-green-400">{cancellationLine}</p>

        {/* 6. What's inside */}
        <section className="mt-8" aria-labelledby="whats-inside">
          <h2 id="whats-inside" className="text-[15px] font-bold text-lc-green-800">
            What&apos;s inside · {sku.bookCount} books
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sku.titles.map((t) => (
              <li
                key={t}
                className="rounded-[10px] border border-lc-border bg-white px-3 py-2 text-[14px] text-lc-green-800"
              >
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-lc-green-400">All books A4 size.</p>
        </section>

        {/* 7. Ebook / course upsell — below the primary action, missing rows hidden */}
        <ProductUpsell skuCode={sku.code as SkuCode} />

        {/* 8. Trust strip */}
        <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-lc-border pt-5 text-[13px] text-lc-green-400">
          <span>Dispatched from Bengaluru</span>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="font-semibold text-lc-green-700 underline underline-offset-4">
            WhatsApp us
          </a>
          <Link href="/track" className="font-semibold text-lc-green-700 underline underline-offset-4">
            Track your order
          </Link>
        </div>
      </div>

      {/* Sticky thumb-reachable buy button on mobile (§15 item 4). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-lc-border bg-[rgba(250,247,242,0.95)] [backdrop-filter:blur(8px)] sm:hidden">
        <div className="mx-auto flex max-w-container items-center justify-between gap-4 px-6 py-3">
          <div className="text-sm">
            <div className="font-extrabold text-lc-green-800">
              ₹{(sku.pricePaise / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[12px] text-lc-green-400">shipping included</div>
          </div>
          <Button asChild>
            <Link href={`/${sku.code}/checkout`}>Buy this set</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
