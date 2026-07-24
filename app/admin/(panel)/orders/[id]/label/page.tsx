import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SELLER } from "@/lib/invoice";
import { getAdminUser } from "@/app/admin/_lib/session";
import { PrintButton } from "@/components/admin/print-button";

// Print-and-stick shipping label for the courier cover (§14). Admin-gated (the (panel) layout
// already guards, this re-checks so a direct hit can never render an address). All page chrome is
// tagged `no-print` in the layouts; only the bordered card below prints — cut it out for A4.
export const dynamic = "force-dynamic";

function weightLabel(grams: number): string {
  return grams >= 1000 ? `${grams} g (${(grams / 1000).toFixed(2)} kg)` : `${grams} g`;
}

export default async function ShippingLabelPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) redirect("/admin/login");

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) notFound();

  const totalGrams = order.snapshotWeightGrams * order.qty;

  return (
    <div>
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Link
          href={`/admin/orders/${order.id}`}
          className="text-[13px] font-semibold text-lc-green-700 underline underline-offset-2"
        >
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[520px] rounded-[8px] border-2 border-lc-green-800 bg-white p-6 text-lc-green-900">
        {/* FROM — return address (seller §2) */}
        <div className="border-b border-lc-border pb-3 text-[12px] leading-snug text-lc-green-400">
          <div className="text-[11px] font-bold uppercase tracking-wide">From</div>
          <div className="mt-0.5 font-semibold text-lc-green-800">{SELLER.name}</div>
          {SELLER.address.map((line) => (
            <div key={line}>{line}</div>
          ))}
          <div>Phone: {SELLER.phone}</div>
        </div>

        {/* TO — the recipient, visual focus */}
        <div className="py-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-lc-green-400">To</div>
          <div className="mt-1 text-2xl font-extrabold leading-tight">{order.customerName}</div>
          <div className="mt-1 text-[17px] leading-snug">
            {order.addrLine1}
            <br />
            {order.addrLine2 && (
              <>
                {order.addrLine2}
                <br />
              </>
            )}
            {order.city}, {order.state}
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-wide">{order.pincode}</div>
          <div className="mt-1 text-[17px] font-semibold">Phone: {order.customerPhone}</div>
        </div>

        {/* Shipment meta */}
        <div className="border-t border-lc-border pt-3 text-[13px] leading-relaxed text-lc-green-800">
          <div>
            <span className="font-semibold">Order:</span> {order.id}
          </div>
          <div>
            <span className="font-semibold">Contents:</span> {order.snapshotName} · qty {order.qty}
          </div>
          <div>
            <span className="font-semibold">Weight:</span> {weightLabel(totalGrams)}
          </div>
          {order.awb && (
            <div>
              <span className="font-semibold">AWB:</span> {order.awb}
              {order.courier ? ` · ${order.courier}` : ""}
            </div>
          )}
          <div className="mt-1 text-[12px] text-lc-green-400">
            Dispatched from Bengaluru{order.fulfilmentType ? ` · ${order.fulfilmentType}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
