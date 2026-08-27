import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { examBadge } from "@/app/_lib/sku-view";
import { OG_SIZE, ogCard } from "@/app/_lib/og";

// Per-set share card (P1-5) — set name, book count, price. Live from the DB, so a price
// change never leaves a stale card behind.
export const alt = "Learn Crew Publications book set";
export const size = OG_SIZE;
export const contentType = "image/png";
// Same reason as the page: live price/availability, and `next build` must not need a database.
export const dynamic = "force-dynamic";

// The generated wrapper awaits ctx.params before calling this handler, so `params` is a plain
// object here — not a Promise, unlike a page's.
export default async function Image({ params }: { params: { sku: string } }) {
  const sku = await prisma.sku
    .findUnique({ where: { code: params.sku } })
    .catch(() => null);

  // Unknown/inactive SKU: fall back to the site card rather than 500 — a crawler hitting a
  // stale URL should still get a valid image.
  if (!sku || !sku.active) {
    return new ImageResponse(
      ogCard({
        eyebrow: "PGCET  ·  MAT  ·  CAT  ·  CLAT",
        title: "Entrance-exam book sets",
        lines: ["Printed sets, one clear price", "Shipping included, dispatched from Bengaluru"],
      }),
      size,
    );
  }

  return new ImageResponse(
    ogCard({
      eyebrow: examBadge(sku.code),
      title: sku.name,
      lines: [
        `${sku.bookCount} books · A4 size`,
        `Rs. ${(sku.pricePaise / 100).toLocaleString("en-IN")} · shipping included`,
      ],
    }),
    size,
  );
}
