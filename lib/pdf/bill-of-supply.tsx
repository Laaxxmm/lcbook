// Bill of Supply (spec §12) — NOT a tax invoice; printed books are exempt (HSN 4901).
// @react-pdf/renderer only (spec §1 forbids Puppeteer/Playwright/headless Chrome — they get
// OOM-killed on Railway). Rendered ENTIRELY from the order snapshot via buildInvoiceData
// (§5, load-bearing) so a past invoice never re-renders with edited catalogue values.
// GST fields are built now but only rendered when GST_ENABLED (§12) — shipped dormant.
//
// Contract (frozen): renderBillOfSupply(data) => Promise<Buffer>.
import * as React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { buildInvoiceData } from "@/lib/invoice";
import { amountInWords } from "@/lib/pdf/amount-in-words";

export type InvoiceData = ReturnType<typeof buildInvoiceData>;

// Brand colours (§16).
const GREEN = "#0E3B2E";
const MUTED = "#4A554E";
const GOLD = "#E8A33D";
const CREAM = "#FAF7F2";
const BORDER = "#E6E0D5";

// PDF-local money formatter. react-pdf's default Helvetica has no ₹ (U+20B9) glyph,
// so it renders a stray superscript — use "Rs. " with Indian digit grouping instead.
// Web keeps ₹ via lib/money.formatRupees (unchanged).
function formatRs(paise: number): string {
  const rupees = (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Rs. ${rupees}`;
}

// e.g. "24 JUL 2026".
function formatDate(date: Date | string): string {
  return new Date(date)
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
    .toUpperCase();
}

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: GREEN, lineHeight: 1.4 },

  // Header band.
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: GREEN,
    color: CREAM,
    padding: "16 20",
    borderRadius: 8,
  },
  brand: { fontSize: 20, fontWeight: 700, color: CREAM, letterSpacing: 0.3 },
  brandSub: { fontSize: 8.5, color: GOLD, marginTop: 3, letterSpacing: 2 },
  docTitle: { fontSize: 15, fontWeight: 700, color: CREAM, textAlign: "right" },
  docNote: { fontSize: 7.5, color: "#CDE0D6", textAlign: "right", marginTop: 4, maxWidth: 210 },

  // Invoice meta strip.
  meta: {
    flexDirection: "row",
    marginTop: 14,
    borderRadius: 8,
    border: 1,
    borderColor: BORDER,
    backgroundColor: CREAM,
    padding: "10 16",
  },
  metaCell: { marginRight: 28 },
  metaLabel: { fontSize: 7.5, textTransform: "uppercase", color: MUTED, letterSpacing: 0.8, marginBottom: 2 },
  metaValue: { fontSize: 12, fontWeight: 700, color: GREEN },

  // Seller / Buyer cards.
  parties: { flexDirection: "row", marginTop: 14 },
  card: {
    flex: 1,
    borderRadius: 8,
    border: 1,
    borderColor: BORDER,
    padding: 14,
  },
  cardGap: { width: 12 },
  cardLabel: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: GOLD, letterSpacing: 1, marginBottom: 6 },
  cardName: { fontSize: 11, fontWeight: 700, color: GREEN, marginBottom: 2 },
  muted: { color: MUTED },

  // Line-items table.
  table: { marginTop: 16, border: 1, borderColor: BORDER, borderRadius: 6 },
  thead: { flexDirection: "row", backgroundColor: GREEN },
  th: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: CREAM, letterSpacing: 0.5, padding: "7 8" },
  row: { flexDirection: "row", borderTop: 1, borderColor: BORDER },
  td: { fontSize: 9.5, padding: "8 8", color: GREEN },
  cItem: { flex: 1, borderRight: 1, borderColor: BORDER },
  cHsn: { width: 46, borderRight: 1, borderColor: BORDER, textAlign: "center" },
  cQty: { width: 34, borderRight: 1, borderColor: BORDER, textAlign: "center" },
  cUnit: { width: 82, borderRight: 1, borderColor: BORDER, textAlign: "right" },
  cAmt: { width: 90, textAlign: "right" },

  // Totals.
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  totals: { width: 260 },
  totRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totKey: { color: MUTED },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    borderTop: 1,
    borderColor: GREEN,
  },
  grandKey: { fontWeight: 700, fontSize: 11, color: GREEN },
  grandVal: { fontWeight: 700, fontSize: 12, color: GREEN },
  words: { marginTop: 12, fontSize: 9.5, color: GREEN },
  wordsLabel: { color: MUTED },

  // Footer / terms.
  footer: {
    marginTop: 28,
    paddingTop: 12,
    borderTop: 1,
    borderColor: BORDER,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
    lineHeight: 1.5,
  },
});

function BillOfSupply({ data }: { data: InvoiceData }) {
  const { seller, buyer, lineItems, totalPaise, invoiceNumber, date, gst } = data;
  return (
    <Document title={`Bill of Supply ${invoiceNumber ?? ""}`}>
      <Page size="A4" style={s.page}>
        {/* Brand header — text logo (§12: text logo fine if no asset). */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Learn Crew</Text>
            <Text style={s.brandSub}>PUBLICATIONS</Text>
          </View>
          <View>
            <Text style={s.docTitle}>Bill of Supply</Text>
            <Text style={s.docNote}>Not a tax invoice · printed books exempt · HSN 4901</Text>
          </View>
        </View>

        {/* Invoice meta — values in uppercase. */}
        <View style={s.meta}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Invoice no.</Text>
            <Text style={s.metaValue}>{(invoiceNumber ?? "—").toUpperCase()}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Date</Text>
            <Text style={s.metaValue}>{formatDate(date)}</Text>
          </View>
          {gst ? (
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Place of supply</Text>
              <Text style={s.metaValue}>{gst.placeOfSupply.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        {/* FROM → TO — seller (§2) and buyer in rounded cards. */}
        <View style={s.parties}>
          <View style={s.card}>
            <Text style={s.cardLabel}>From · Seller</Text>
            <Text style={s.cardName}>{seller.name}</Text>
            {seller.address.map((line) => (
              <Text key={line} style={s.muted}>
                {line}
              </Text>
            ))}
            <Text style={s.muted}>
              {seller.email} · {seller.phone}
            </Text>
            {gst && seller.gstin ? <Text style={s.muted}>GSTIN: {seller.gstin}</Text> : null}
          </View>
          <View style={s.cardGap} />
          <View style={s.card}>
            <Text style={s.cardLabel}>To · Bill to</Text>
            <Text style={s.cardName}>{buyer.name}</Text>
            <Text style={s.muted}>{buyer.address.line1}</Text>
            {buyer.address.line2 ? <Text style={s.muted}>{buyer.address.line2}</Text> : null}
            <Text style={s.muted}>
              {buyer.address.city}, {buyer.address.state} {buyer.address.pincode}
            </Text>
            {gst && gst.buyerGstin ? <Text style={s.muted}>GSTIN: {gst.buyerGstin}</Text> : null}
          </View>
        </View>

        {/* Line items — from the order snapshot (§5), HSN 4901, qty, amount. */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.cItem]}>Item</Text>
            <Text style={[s.th, s.cHsn]}>HSN</Text>
            <Text style={[s.th, s.cQty]}>Qty</Text>
            <Text style={[s.th, s.cUnit]}>Unit price</Text>
            <Text style={[s.th, s.cAmt]}>Amount</Text>
          </View>
          {lineItems.map((li, i) => (
            <View key={i} style={s.row}>
              <View style={[s.td, s.cItem]}>
                <Text>
                  {li.description} ({li.bookCount} books)
                </Text>
                {li.titles.length ? <Text style={s.muted}>{li.titles.join(", ")}</Text> : null}
              </View>
              <Text style={[s.td, s.cHsn]}>{li.hsn}</Text>
              <Text style={[s.td, s.cQty]}>{li.qty}</Text>
              <Text style={[s.td, s.cUnit]}>{formatRs(li.unitPricePaise)}</Text>
              <Text style={[s.td, s.cAmt]}>{formatRs(li.amountPaise)}</Text>
            </View>
          ))}
        </View>

        {/* Totals. */}
        <View style={s.totalsWrap}>
          <View style={s.totals}>
            {gst ? (
              <>
                <View style={s.totRow}>
                  <Text style={s.totKey}>Taxable value</Text>
                  <Text>{formatRs(gst.taxableValuePaise)}</Text>
                </View>
                <View style={s.totRow}>
                  <Text style={s.totKey}>CGST</Text>
                  <Text>{formatRs(gst.cgstPaise)}</Text>
                </View>
                <View style={s.totRow}>
                  <Text style={s.totKey}>SGST</Text>
                  <Text>{formatRs(gst.sgstPaise)}</Text>
                </View>
                <View style={s.totRow}>
                  <Text style={s.totKey}>IGST</Text>
                  <Text>{formatRs(gst.igstPaise)}</Text>
                </View>
              </>
            ) : null}
            <View style={s.grandRow}>
              <Text style={s.grandKey}>Total (shipping included)</Text>
              <Text style={s.grandVal}>{formatRs(totalPaise)}</Text>
            </View>
          </View>
        </View>

        <Text style={s.words}>
          <Text style={s.wordsLabel}>Amount in words: </Text>
          {amountInWords(totalPaise)}
        </Text>

        <Text style={s.footer}>
          Bill of Supply issued under the composition/exempt scheme — this is not a tax invoice.
          Printed books are exempt from GST (HSN 4901). Prices are inclusive of shipping.
          {"\n"}This is a computer-generated document and needs no signature.
        </Text>
      </Page>
    </Document>
  );
}

/** Render a Bill of Supply PDF to a Buffer for email attachment (§11, §12). */
export function renderBillOfSupply(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<BillOfSupply data={data} />);
}
