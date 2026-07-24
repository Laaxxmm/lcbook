import crypto from "node:crypto";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createLocalOrder } from "@/lib/orders/create";
import type { SkuCode } from "@/lib/catalogue";

export { prisma };

const CUSTOMER = { name: "Test Buyer", email: "buyer@example.com", phone: "9000000000" };
const ADDRESS = {
  line1: "1 Test Street",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
};

/** Truncate all tables and reset the order-number sequence between tests. */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "OrderEvent","SheetSyncJob","WebhookEvent","SkuAudit","Order","LoginToken","User","InvoiceCounter","Sku" RESTART IDENTITY CASCADE`,
  );
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE order_number_seq RESTART WITH 1`);
}

export async function makeSku(
  overrides: Partial<{
    code: SkuCode;
    name: string;
    bookCount: number;
    titles: string[];
    pricePaise: number;
    weightGrams: number;
    stockQty: number;
  }> = {},
) {
  return prisma.sku.create({
    data: {
      code: overrides.code ?? "CLAT",
      name: overrides.name ?? "CLAT book set",
      bookCount: overrides.bookCount ?? 13,
      titles: overrides.titles ?? ["Logical", "Quantitative", "English", "Legal"],
      pricePaise: overrides.pricePaise ?? 900_000,
      weightGrams: overrides.weightGrams ?? 5500,
      stockQty: overrides.stockQty ?? 100,
    },
  });
}

/** Create an order (with frozen snapshot) and force it to a status for test setup. */
export async function makeOrderAt(
  status: OrderStatus,
  extra: Prisma.OrderUpdateInput = {},
  skuCode: SkuCode = "CLAT",
) {
  const order = await createLocalOrder({
    skuCode,
    customer: CUSTOMER,
    address: ADDRESS,
  });
  return prisma.order.update({ where: { id: order.id }, data: { status, ...extra } });
}

export async function makeOrder(skuCode: SkuCode = "CLAT") {
  return createLocalOrder({ skuCode, customer: CUSTOMER, address: ADDRESS });
}

/** Sign a webhook body exactly as Razorpay would (HMAC-SHA256, hex). */
export function signWebhook(rawBody: string): string {
  return crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET ?? "")
    .update(rawBody)
    .digest("hex");
}

export function paymentCapturedBody(params: {
  paymentId: string;
  razorpayOrderId: string;
  amountPaise: number;
  source?: string;
}): string {
  return JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: params.paymentId,
          order_id: params.razorpayOrderId,
          amount: params.amountPaise,
          notes: { source: params.source ?? "publications" },
        },
      },
    },
  });
}
