-- CreateTable
CREATE TABLE "ShopSubscription" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSubscription_shop_key" ON "ShopSubscription"("shop");

-- CreateIndex
CREATE INDEX "ShopSubscription_shop_idx" ON "ShopSubscription"("shop");
