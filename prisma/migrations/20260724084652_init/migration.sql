-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAID', 'CONFIRMED', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'PRINT_QUEUED', 'PRINT_STARTED', 'PRINT_DONE', 'CANCELLED_BY_USER', 'CANCELLED_BY_ADMIN', 'REFUND_INITIATED', 'REFUNDED', 'RTO', 'DAMAGE_REPLACEMENT');

-- CreateEnum
CREATE TYPE "FulfilmentType" AS ENUM ('IN_STOCK', 'POD');

-- CreateEnum
CREATE TYPE "Actor" AS ENUM ('SYSTEM', 'ADMIN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('INITIATED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "LoginTokenType" AS ENUM ('MAGIC_LINK', 'OTP');

-- CreateTable
CREATE TABLE "Sku" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bookCount" INTEGER NOT NULL,
    "titles" TEXT[],
    "pricePaise" INTEGER NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "printQueueCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "skuCode" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "amountPaise" INTEGER NOT NULL,
    "fulfilmentType" "FulfilmentType",
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "addrLine1" TEXT NOT NULL,
    "addrLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "awb" TEXT,
    "courier" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "printStartedAt" TIMESTAMP(3),
    "cancelRequestedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "refundId" TEXT,
    "refundAmountPaise" INTEGER,
    "gatewayFeeRetainedPaise" INTEGER,
    "refundStatus" "RefundStatus",
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "consentIp" TEXT,
    "consentTextVersion" TEXT,
    "invoiceNumber" TEXT,
    "discountCode" TEXT,
    "amountMismatchFlagged" BOOLEAN NOT NULL DEFAULT false,
    "snapshotName" TEXT NOT NULL,
    "snapshotTitles" TEXT[],
    "snapshotPricePaise" INTEGER NOT NULL,
    "snapshotBookCount" INTEGER NOT NULL,
    "snapshotWeightGrams" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "actor" "Actor" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuAudit" (
    "id" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkuAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "LoginTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "financialYear" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("financialYear")
);

-- CreateTable
CREATE TABLE "SheetSyncJob" (
    "orderId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SheetSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_seq_key" ON "Order"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_refundId_key" ON "Order"("refundId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_discountCode_key" ON "Order"("discountCode");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_skuCode_idx" ON "Order"("skuCode");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");

-- CreateIndex
CREATE INDEX "SkuAudit_skuCode_idx" ON "SkuAudit"("skuCode");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_providerEventId_key" ON "WebhookEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "LoginToken_userId_idx" ON "LoginToken"("userId");

-- CreateIndex
CREATE INDEX "SheetSyncJob_orderId_idx" ON "SheetSyncJob"("orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_skuCode_fkey" FOREIGN KEY ("skuCode") REFERENCES "Sku"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuAudit" ADD CONSTRAINT "SkuAudit_skuCode_fkey" FOREIGN KEY ("skuCode") REFERENCES "Sku"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginToken" ADD CONSTRAINT "LoginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetSyncJob" ADD CONSTRAINT "SheetSyncJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stock never negative — DB CHECK constraint, not app logic (spec §7).
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_stockQty_nonneg" CHECK ("stockQty" >= 0);
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_printQueueCount_nonneg" CHECK ("printQueueCount" >= 0);

-- Human order-number source (LC-2627-000431). Monotonic, unique under concurrency.
CREATE SEQUENCE IF NOT EXISTS "order_number_seq";
