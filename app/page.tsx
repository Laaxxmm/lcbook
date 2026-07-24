import { Container } from "@/components/ui/container";
import { Price } from "@/components/ui/price";
import { StockBadge } from "@/components/ui/stock-badge";
import { Button } from "@/components/ui/button";

// Placeholder landing route so `next build` has a page. The public-pages/catalogue
// agent (§15) replaces this with the real SSG catalogue grid.
export default function Home() {
  return (
    <Container className="py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-lc-green-400">
        Learn Crew Publications
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-lc-green-800">
        Entrance-exam book sets
      </h1>
      <p className="mt-3 max-w-prose text-lc-green-400">
        PGCET, MAT, CAT and CLAT. One price, shipping included, dispatched from Bengaluru.
        The catalogue is coming soon.
      </p>
      <div className="mt-8 flex flex-col items-start gap-4">
        <Price paise={160000} />
        <StockBadge inStock />
        <Button>Buy this set</Button>
      </div>
    </Container>
  );
}
