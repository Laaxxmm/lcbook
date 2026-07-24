import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { Order } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildInvoiceData } from "@/lib/invoice";
import { renderBillOfSupply } from "@/lib/pdf/bill-of-supply";
import { getAdminUser } from "@/app/admin/_lib/session";
import { SESSION_COOKIE, verifyOrderToken, verifySession } from "@/app/_lib/tokens";

// Bill of Supply PDF download (§12). This is a customer PII document, so it is gated the same way
// /track is — a bare order id NEVER streams it (IDOR guard). Access is granted to a valid ADMIN
// session, OR a customer who proves this exact order: the durable, signed order token (?token=…,
// the same one the /track card carries) or a logged-in lc_session that owns the order.
// @react-pdf/renderer runs on Node, not the edge.
export const runtime = "nodejs";

async function authorized(order: Order, token: string | undefined): Promise<boolean> {
  if (await getAdminUser()) return true;
  // Durable order token bound to THIS order (has a dot; single-use magic tokens are excluded).
  if (token && token.includes(".") && verifyOrderToken(token) === order.id) return true;
  // Logged-in customer who owns this order.
  const uid = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (uid) {
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (user && user.email === order.customerEmail) return true;
  }
  return false;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token") ?? undefined;

  const order = await prisma.order.findUnique({ where: { id } });
  // Same generic 404 for missing and unauthorized — never reveal an order to a bare id.
  if (!order || !(await authorized(order, token))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Invoice number is allocated at PAID→CONFIRMED (§12) — no number, no Bill of Supply yet.
  if (!order.invoiceNumber) {
    return NextResponse.json({ error: "Bill of Supply is not available for this order yet." }, { status: 404 });
  }

  const pdf = await renderBillOfSupply(buildInvoiceData(order));
  const safeNo = order.invoiceNumber.replace(/\//g, "-"); // LC/2026-27/0001 → filename-safe
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="BillOfSupply-${safeNo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
