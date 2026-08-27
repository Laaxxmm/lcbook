import { prisma } from "@/lib/db";
import { SELLER } from "@/lib/invoice";

// llms.txt — a plain-text summary for AI crawlers/assistants, mirroring learncrew.org.
// Generated from the live catalogue so prices and contents never drift from the store.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rupees = (paise: number) => `Rs. ${(paise / 100).toLocaleString("en-IN")}`;

export async function GET(): Promise<Response> {
  const base = (process.env.APP_URL ?? "https://publications.learncrew.org").replace(/\/$/, "");
  let sets = "";
  try {
    const skus = await prisma.sku.findMany({ where: { active: true }, orderBy: { pricePaise: "asc" } });
    sets = skus
      .map(
        (s) =>
          `- [${s.name}](${base}/${s.code}): ${rupees(s.pricePaise)}, shipping included. ` +
          `${s.bookCount} books — ${s.titles.join(", ")}. A4 size.`,
      )
      .join("\n");
  } catch {
    sets = "- Catalogue temporarily unavailable.";
  }

  const body = `# Learn Crew Publications

> Printed entrance-exam book sets for PGCET (MBA/MCA), MAT, CAT and CLAT, sold online and
> dispatched from Bengaluru, India. One clear price per set with shipping included — no hidden
> charges. Part of Learn Crew (learncrew.org), which also runs live online coaching and free
> exam tools.

## Book sets (printed, sold on this site)
${sets}

Sets only — individual books are not sold separately. In-stock sets dispatch in 1-2 working
days; out-of-stock sets are printed to order and ship in 7-10 working days. Prices include
shipping anywhere in India.

## Digital products (sold on our learning platform, not on this site)
- eBooks, mock-test series and recorded courses are listed on the store's eBook and Mocks tabs
  and link out to elearning.learncrew.org. They are non-refundable, and buying a printed set
  does not include digital access.

## Policies
- [Terms & Conditions](${base}/terms)
- [Refund & Cancellation](${base}/refund-policy): cancellations refunded minus payment-gateway
  charges; no returns except damage in transit; print-to-order sets cannot be cancelled once
  printing starts.
- [Shipping Policy](${base}/shipping-policy)
- [Privacy Policy](${base}/privacy-policy)

## Contact
${SELLER.displayName} (${SELLER.name})
${SELLER.displayAddress}
Email: ${SELLER.email} · Phone/WhatsApp: ${SELLER.phone}

## Related
- Live online coaching, free tools and blog: https://learncrew.org
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
