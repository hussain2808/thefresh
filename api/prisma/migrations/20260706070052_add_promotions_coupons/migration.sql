-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('COUPON', 'CASHBACK');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PromotionConditionType" AS ENUM ('MIN_ORDER_VALUE', 'ZONE', 'AREA', 'DELIVERY_METHOD', 'FIRST_ORDER', 'CATEGORY', 'PRODUCT', 'BRAND', 'CUSTOMER_SEGMENT', 'PAYMENT_METHOD', 'ORDER_COUNT');

-- CreateEnum
CREATE TYPE "PromotionRewardType" AS ENUM ('FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'FREE_DELIVERY', 'CASHBACK_FIXED', 'CASHBACK_PERCENTAGE');

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionType" NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCondition" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "conditionType" "PromotionConditionType" NOT NULL,
    "operator" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "PromotionCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionReward" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "rewardType" "PromotionRewardType" NOT NULL,
    "value" INTEGER NOT NULL,
    "maxDiscountFils" INTEGER,

    CONSTRAINT "PromotionReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "promotionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "usageLimit" INTEGER,
    "perUserLimit" INTEGER,
    "stackable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("promotionId")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "discountAmountFils" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- AddForeignKey
ALTER TABLE "PromotionCondition" ADD CONSTRAINT "PromotionCondition_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionReward" ADD CONSTRAINT "PromotionReward_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
