import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Price } from "@/components/ui/price";
import { stockStatus, stockTone } from "@/components/ui/stock-badge";
import { examBadge } from "@/app/_lib/sku-view";

// Catalogue home (§15). SSR so live prices/availability show and this indexed URL keeps its
// SEO (§1) — rendered on demand, so `next build` never needs a database. Sets only; individual
// books are never sold (§3), and every price already includes shipping (§16, never a ₹0 line).
export const dynamic = "force-dynamic";

export default async function Home() {
  const skus = await prisma.sku.findMany({
    where: { active: true },
    orderBy: { pricePaise: "asc" },
  });

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-lc-green-400">
          Learn Crew Publications
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-lc-green-800 sm:text-4xl">
          Entrance-exam book sets
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-lc-green-400">
          Print sets for PGCET, MAT, CAT and CLAT — one clear price with shipping included,
          dispatched from Bengaluru. No hidden &ldquo;call to know.&rdquo;
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skus.map((sku) => {
          const stock = stockStatus(sku.stockQty);
          const StockIcon = stock.Icon;
          return (
            <Link
              key={sku.code}
              href={`/${sku.code}`}
              className="group relative flex flex-col overflow-hidden rounded-[14px] border border-lc-border bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(232,163,61,0.5)] hover:shadow-[0_12px_28px_rgba(14,59,46,0.1)]"
            >
              {/* Gold hairline that wipes in on hover — restrained accent. */}
              <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-lc-gold transition-transform duration-300 group-hover:scale-x-100" />
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex w-fit rounded-full bg-[rgba(14,59,46,0.06)] px-3 py-1 text-[12px] font-bold text-lc-green-700">
                  {examBadge(sku.code)}
                </span>
                {/* Edge ribbon — copy driven only by real stockQty. */}
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${stockTone[stock.tone]}`}
                >
                  <StockIcon className="h-3 w-3 shrink-0" aria-hidden />
                  {stock.short}
                </span>
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
                  <p className="mt-0.5 text-[12px] font-medium text-lc-green-400">
                    shipping included
                  </p>
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

      {skus.length === 0 && (
        <p className="mt-8 text-lc-green-400">The catalogue is being updated. Please check back soon.</p>
      )}
    </Container>
  );
}
