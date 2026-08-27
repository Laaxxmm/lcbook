import type { Order, Prisma } from "@prisma/client";
import { GST_ENABLED } from "@/lib/money";

// Seller block (spec §2). GSTIN: none (GST_ENABLED = false).
// `name` = registered legal entity (kept on legal docs: Bill of Supply, Terms operator clause).
// `displayName` = brand shown everywhere on the site (footer, contact, label, email).
export const SELLER = {
  name: "Learncrew Talent Pvt Ltd",
  displayName: "Learn Crew Publications",
  // ONE canonical customer-facing address (NAP consistency — must match Google Business Profile
  // and every directory listing). Use this everywhere on the site; `address` below stays the
  // full postal form for the Bill of Supply / courier label.
  displayAddress: "No. 57, Nandanam Layout, Nisarga Colony, 13th C Cross, 9th Cross, 10th Main Rd, Horamavu, Bengaluru 560043",
  address: [
    "No 57, Nandanam Layout, Nisarga Colony, 13th C Cross,",
    "9th Cross, 10th Main Rd, Horamavu, Bengaluru 560043",
  ],
  email: "support@learncrew.org",
  phone: "+91 97382 55304",
  gstin: null as string | null,
} as const;

/**
 * Indian financial year for a date (April–March). e.g. 2026-07-24 → "2026-27".
 */
export function financialYearFor(d: Date): string {
  const year = d.getFullYear();
  const start = d.getMonth() >= 3 ? year : year - 1; // FY starts April (month index 3)
  const end = (start + 1) % 100;
  return `${start}-${String(end).padStart(2, "0")}`;
}

/**
 * Allocate the next Bill of Supply number for a financial year — sequential, no
 * gaps, no duplicates (§12). MUST run inside the same locked txn as PAID→CONFIRMED.
 * The atomic INSERT … ON CONFLICT … RETURNING serialises concurrent callers on the
 * counter row, so it is never derived from a timestamp or row count.
 */
export async function allocateInvoiceNumber(
  tx: Prisma.TransactionClient,
  financialYear: string,
): Promise<string> {
  const rows = await tx.$queryRaw<{ lastNumber: number }[]>`
    INSERT INTO "InvoiceCounter" ("financialYear", "lastNumber")
    VALUES (${financialYear}, 1)
    ON CONFLICT ("financialYear")
    DO UPDATE SET "lastNumber" = "InvoiceCounter"."lastNumber" + 1
    RETURNING "lastNumber"`;
  const n = rows[0]?.lastNumber;
  if (n === undefined) throw new Error("invoice counter did not return a number");
  return `LC/${financialYear}/${String(n).padStart(4, "0")}`;
}

// Bill of Supply data — rendered ENTIRELY from the order snapshot, never the live
// Sku row (§5, load-bearing). Printed books are exempt, HSN 4901 (§12).
export function buildInvoiceData(order: Order) {
  const amountPaise = order.snapshotPricePaise * order.qty;
  return {
    invoiceNumber: order.invoiceNumber,
    date: order.createdAt,
    seller: SELLER,
    buyer: {
      name: order.customerName,
      address: {
        line1: order.addrLine1,
        line2: order.addrLine2,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
      },
    },
    lineItems: [
      {
        description: order.snapshotName,
        titles: order.snapshotTitles,
        hsn: "4901", // printed books, exempt
        bookCount: order.snapshotBookCount,
        qty: order.qty,
        unitPricePaise: order.snapshotPricePaise,
        amountPaise,
      },
    ],
    totalPaise: amountPaise,
    // GST fields built now, rendered only when GST_ENABLED (§12). Ship dormant.
    gst: GST_ENABLED
      ? {
          sellerGstin: SELLER.gstin,
          buyerGstin: null as string | null,
          placeOfSupply: order.state,
          taxableValuePaise: amountPaise,
          cgstPaise: 0,
          sgstPaise: 0,
          igstPaise: 0,
        }
      : null,
  };
}
