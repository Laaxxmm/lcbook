import Link from "next/link";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { Price } from "@/components/ui/price";
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
        {skus.map((sku) => (
          <Link
            key={sku.code}
            href={`/${sku.code}`}
            className="group flex flex-col rounded-[14px] border border-lc-border bg-white p-5 transition hover:shadow-[0_8px_24px_rgba(14,59,46,0.08)]"
          >
            <span className="inline-flex w-fit rounded-full bg-[rgba(14,59,46,0.06)] px-3 py-1 text-[12px] font-bold text-lc-green-700">
              {examBadge(sku.code)}
            </span>
            <h2 className="mt-3 text-lg font-bold text-lc-green-800">{sku.name}</h2>
            <p className="mt-1 text-[13px] text-lc-green-400">
              {sku.bookCount} books · {sku.titles.slice(0, 4).join(", ")}
              {sku.titles.length > 4 ? "…" : ""}
            </p>
            <div className="mt-4 flex items-end justify-between">
              <Price paise={sku.pricePaise} />
              <span className="text-sm font-bold text-lc-green-700 group-hover:underline">
                View set &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>

      {skus.length === 0 && (
        <p className="mt-8 text-lc-green-400">The catalogue is being updated. Please check back soon.</p>
      )}
    </Container>
  );
}
