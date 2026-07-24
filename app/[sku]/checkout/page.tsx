import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { Container } from "@/components/ui/container";
import { StockBadge } from "@/components/ui/stock-badge";
import { availableStock } from "@/lib/inventory";
import { CheckoutForm } from "@/components/store/checkout-form";
import { SESSION_COOKIE, verifySession } from "@/app/_lib/tokens";
import { examBadge } from "@/app/_lib/sku-view";

// Checkout (§8). Guest is the default path; REQUIRE_LOGIN_AT_CHECKOUT (default false) gates it
// behind sign-in. Fulfilment state stays visible before payment. Rendered on demand.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

const POD_MAX_QTY = 10;

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ sku: string }>;
  searchParams: Promise<{ qty?: string }>;
}) {
  const { sku: code } = await params;
  const sku = await prisma.sku.findUnique({ where: { code } });
  if (!sku || !sku.active) notFound();

  // Login gate (§8). Default false → guest checkout.
  if (env.REQUIRE_LOGIN_AT_CHECKOUT) {
    const uid = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
    if (!uid) redirect(`/login?next=${encodeURIComponent(`/${code}/checkout`)}`);
  }

  const qty = await availableStock(prisma, sku.code);
  // Max is real availability for in-stock, a small cap for print-to-order (stock 0).
  const maxQty = qty > 0 ? qty : POD_MAX_QTY;
  // Carry the quantity chosen on the product page (?qty=), clamped to what's allowed.
  const requestedQty = Number((await searchParams).qty);
  const initialQty = Number.isInteger(requestedQty) ? Math.min(Math.max(requestedQty, 1), maxQty) : 1;

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <span className="inline-flex rounded-full bg-[rgba(14,59,46,0.06)] px-3 py-1 text-[12px] font-bold text-lc-green-700">
          {examBadge(sku.code)}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-lc-green-800">Checkout</h1>
        <p className="mt-1 text-[15px] text-lc-green-400">{sku.name}</p>

        <div className="mt-3">
          <StockBadge qty={qty} />
        </div>
        <p className="mt-3 text-[13px] text-lc-green-400">
          One price, shipping included. Cancellations are refunded minus payment-gateway charges.
        </p>

        <div className="mt-6">
          <CheckoutForm
            skuCode={sku.code}
            setName={sku.name}
            amountPaise={sku.pricePaise}
            maxQty={maxQty}
            initialQty={initialQty}
          />
        </div>
      </div>
    </Container>
  );
}
