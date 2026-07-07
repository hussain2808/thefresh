-- AlterTable
ALTER TABLE "Order" ADD COLUMN "subtotalFils" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "quantity" INTEGER,
    "weightGrams" INTEGER,
    "prepOptionId" TEXT,
    "estimatedPriceFils" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
