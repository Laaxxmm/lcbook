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
import { formatRupees } from "@/lib/money";

export type InvoiceData = ReturnType<typeof buildInvoiceData>;

// Brand colours (§16).
const GREEN = "#0E3B2E";
const MUTED = "#4A554E";
const GOLD = "#E8A33D";
const CREAM = "#FAF7F2";
const BORDER = "#E6E0D5";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: GREEN, lineHeight: 1.4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: GREEN,
    color: CREAM,
    padding: "14 18",
    borderRadius: 8,
  },
  brand: { fontSize: 18, fontWeight: 700, color: CREAM },
  brandSub: { fontSize: 9, color: GOLD, marginTop: 2 },
  docTitle: { fontSize: 14, fontWeight: 700, color: CREAM, textAlign: "right" },
  docNote: { fontSize: 7.5, color: CREAM, textAlign: "right", marginTop: 2, maxWidth: 190 },
  section: { marginTop: 18 },
  cols: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 8, textTransform: "uppercase", color: MUTED, marginBottom: 3, letterSpacing: 0.5 },
  muted: { color: MUTED },
  th: {
    flexDirection: "row",
    borderBottom: 1,
    borderColor: GREEN,
    paddingBottom: 5,
    marginBottom: 6,
    marginTop: 4,
    fontSize: 8,
    textTransform: "uppercase",
    color: MUTED,
  },
  cItem: { flex: 1 },
  cHsn: { width: 44 },
  cQty: { width: 30, textAlign: "right" },
  cUnit: { width: 70, textAlign: "right" },
  cAmt: { width: 80, textAlign: "right" },
  itemRow: { flexDirection: "row", marginBottom: 6, alignItems: "flex-start" },
  totals: { marginTop: 12, paddingTop: 8, borderTop: 1, borderColor: BORDER },
  totRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 3 },
  totKey: { color: MUTED, width: 150, textAlign: "right", marginRight: 12 },
  totVal: { width: 80, textAlign: "right" },
  grand: { fontWeight: 700, fontSize: 11, color: GREEN },
  footer: { marginTop: 26, paddingTop: 10, borderTop: 1, borderColor: BORDER, fontSize: 8, color: MUTED },
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
            <Text style={s.docNote}>Not a tax invoice · printed books are exempt (HSN 4901)</Text>
          </View>
        </View>

        {/* Seller (§2) + invoice meta. */}
        <View style={[s.section, s.cols]}>
          <View style={{ maxWidth: 280 }}>
            <Text style={s.label}>Seller</Text>
            <Text>{seller.name}</Text>
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
          <View style={{ maxWidth: 200 }}>
            <Text style={s.label}>Invoice no.</Text>
            <Text>{invoiceNumber ?? "—"}</Text>
            <Text style={[s.label, { marginTop: 8 }]}>Date</Text>
            <Text style={s.muted}>{new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Text>
            {gst ? (
              <>
                <Text style={[s.label, { marginTop: 8 }]}>Place of supply</Text>
                <Text style={s.muted}>{gst.placeOfSupply}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Buyer. */}
        <View style={s.section}>
          <Text style={s.label}>Bill to</Text>
          <Text>{buyer.name}</Text>
          <Text style={s.muted}>{buyer.address.line1}</Text>
          {buyer.address.line2 ? <Text style={s.muted}>{buyer.address.line2}</Text> : null}
          <Text style={s.muted}>
            {buyer.address.city}, {buyer.address.state} {buyer.address.pincode}
          </Text>
          {gst && gst.buyerGstin ? <Text style={s.muted}>GSTIN: {gst.buyerGstin}</Text> : null}
        </View>

        {/* Line items — from the order snapshot (§5), HSN 4901, qty, amount. */}
        <View style={s.section}>
          <View style={s.th}>
            <Text style={s.cItem}>Item</Text>
            <Text style={s.cHsn}>HSN</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cUnit}>Unit price</Text>
            <Text style={s.cAmt}>Amount</Text>
          </View>
          {lineItems.map((li, i) => (
            <View key={i} style={s.itemRow}>
              <View style={s.cItem}>
                <Text>
                  {li.description} ({li.bookCount} books)
                </Text>
                {li.titles.length ? <Text style={s.muted}>{li.titles.join(", ")}</Text> : null}
              </View>
              <Text style={s.cHsn}>{li.hsn}</Text>
              <Text style={s.cQty}>{li.qty}</Text>
              <Text style={s.cUnit}>{formatRupees(li.unitPricePaise)}</Text>
              <Text style={s.cAmt}>{formatRupees(li.amountPaise)}</Text>
            </View>
          ))}

          <View style={s.totals}>
            {gst ? (
              <>
                <View style={s.totRow}>
                  <Text style={s.totKey}>Taxable value</Text>
                  <Text style={s.totVal}>{formatRupees(gst.taxableValuePaise)}</Text>
                </View>
                <View style={s.totRow}>
                  <Text style={s.totKey}>CGST</Text>
                  <Text style={s.totVal}>{formatRupees(gst.cgstPaise)}</Text>
                </View>
                <View style={s.totRow}>
                  <Text style={s.totKey}>SGST</Text>
                  <Text style={s.totVal}>{formatRupees(gst.sgstPaise)}</Text>
                </View>
                <View style={s.totRow}>
                  <Text style={s.totKey}>IGST</Text>
                  <Text style={s.totVal}>{formatRupees(gst.igstPaise)}</Text>
                </View>
              </>
            ) : null}
            <View style={s.totRow}>
              <Text style={[s.totKey, s.grand]}>Total (shipping included)</Text>
              <Text style={[s.totVal, s.grand]}>{formatRupees(totalPaise)}</Text>
            </View>
          </View>
        </View>

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
