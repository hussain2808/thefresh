-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "finalTotalFils" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "actualWeightGrams" INTEGER,
ADD COLUMN     "basePriceFils" INTEGER,
ADD COLUMN     "finalPriceFils" INTEGER,
ADD COLUMN     "prepChargeFils" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "varianceBasisPoints" INTEGER,
ADD COLUMN     "weightModifierPercent" INTEGER;
