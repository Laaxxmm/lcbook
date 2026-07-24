// Bill of Supply (spec §12) — NOT a tax invoice; printed books are exempt (HSN 4901).
// @react-pdf/renderer only (spec §1 forbids Puppeteer/Playwright/headless Chrome).
// Rendered ENTIRELY from the order snapshot via buildInvoiceData (§5, load-bearing).
// GST fields are built now but only rendered when GST_ENABLED (§12) — shipped dormant.
//
// ponytail: minimal-but-valid layout. The email/PDF agent enriches (logo, spacing,
// full GST grid) — the contract is renderBillOfSupply(data) => Promise<Buffer>.
import * as React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { buildInvoiceData } from "@/lib/invoice";
import { formatRupees } from "@/lib/money";

export type InvoiceData = ReturnType<typeof buildInvoiceData>;

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#0E3B2E" },
  h1: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  muted: { color: "#4A554E" },
  section: { marginTop: 16 },
  label: { fontSize: 8, textTransform: "uppercase", color: "#4A554E", marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  th: { flexDirection: "row", borderBottom: 1, borderColor: "#E6E0D5", paddingBottom: 4, marginBottom: 4 },
  cell: { flex: 1 },
  cellNum: { flex: 1, textAlign: "right" },
  total: { marginTop: 10, paddingTop: 6, borderTop: 1, borderColor: "#E6E0D5" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", fontWeight: 700 },
});

function BillOfSupply({ data }: { data: InvoiceData }) {
  const { seller, buyer, lineItems, totalPaise, invoiceNumber, date, gst } = data;
  return (
    <Document title={`Bill of Supply ${invoiceNumber ?? ""}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Bill of Supply</Text>
        <Text style={s.muted}>Not a tax invoice · printed books exempt (HSN 4901)</Text>

        <View style={[s.section, s.row]}>
          <View style={{ maxWidth: 260 }}>
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
          <View style={{ textAlign: "right" }}>
            <Text style={s.label}>Invoice</Text>
            <Text>{invoiceNumber ?? "—"}</Text>
            <Text style={s.muted}>{new Date(date).toLocaleDateString("en-IN")}</Text>
            {gst ? <Text style={s.muted}>Place of supply: {gst.placeOfSupply}</Text> : null}
          </View>
        </View>

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

        <View style={s.section}>
          <View style={s.th}>
            <Text style={s.cell}>Item</Text>
            <Text style={{ width: 40 }}>HSN</Text>
            <Text style={{ width: 30, textAlign: "right" }}>Qty</Text>
            <Text style={s.cellNum}>Amount</Text>
          </View>
          {lineItems.map((li, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
              <View style={s.cell}>
                <Text>
                  {li.description} ({li.bookCount} books)
                </Text>
                <Text style={s.muted}>{li.titles.join(", ")}</Text>
              </View>
              <Text style={{ width: 40 }}>{li.hsn}</Text>
              <Text style={{ width: 30, textAlign: "right" }}>{li.qty}</Text>
              <Text style={s.cellNum}>{formatRupees(li.amountPaise)}</Text>
            </View>
          ))}

          <View style={s.total}>
            {gst ? (
              <>
                <View style={s.row}>
                  <Text style={s.muted}>Taxable value</Text>
                  <Text>{formatRupees(gst.taxableValuePaise)}</Text>
                </View>
                <View style={s.row}>
                  <Text style={s.muted}>CGST / SGST / IGST</Text>
                  <Text>
                    {formatRupees(gst.cgstPaise)} / {formatRupees(gst.sgstPaise)} /{" "}
                    {formatRupees(gst.igstPaise)}
                  </Text>
                </View>
              </>
            ) : null}
            <View style={s.totalRow}>
              <Text>Total (shipping included)</Text>
              <Text>{formatRupees(totalPaise)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/** Render a Bill of Supply PDF to a Buffer for email attachment (§11, §12). */
export function renderBillOfSupply(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<BillOfSupply data={data} />);
}
