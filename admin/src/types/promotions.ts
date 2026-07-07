// Mirrors api/prisma/schema.prisma — Promotion Engine, Coupons only (V1).
// See docs/promotions-design.md.

export type PromotionConditionType =
  | "MIN_ORDER_VALUE"
  | "ZONE"
  | "AREA"
  | "DELIVERY_METHOD"
  | "FIRST_ORDER"
  | "CATEGORY"
  | "PRODUCT"
  | "BRAND"
  | "CUSTOMER_SEGMENT"
  | "PAYMENT_METHOD"
  | "ORDER_COUNT";

export type PromotionRewardType =
  | "FIXED_DISCOUNT"
  | "PERCENTAGE_DISCOUNT"
  | "FREE_DELIVERY"
  | "CASHBACK_FIXED"
  | "CASHBACK_PERCENTAGE";

export type PromotionStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED";

export interface PromotionCondition {
  id: string;
  promotionId: string;
  conditionType: PromotionConditionType;
  operator: string;
  value: unknown;
}

export interface PromotionReward {
  id: string;
  promotionId: string;
  rewardType: PromotionRewardType;
  value: number;
  maxDiscountFils: number | null;
}

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  type: "COUPON" | "CASHBACK";
  status: PromotionStatus;
  startAt: string | null;
  endAt: string | null;
  priority: number;
  isActive: boolean;
  conditions: PromotionCondition[];
  rewards: PromotionReward[];
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  promotionId: string;
  code: string;
  usageLimit: number | null;
  perUserLimit: number | null;
  stackable: boolean;
  promotion: Promotion;
}

// V1-supported condition types only (see docs/promotions-design.md §4).
export const CONDITION_TYPE_OPTIONS: { label: string; value: PromotionConditionType }[] = [
  { label: "Minimum order value", value: "MIN_ORDER_VALUE" },
  { label: "Zone", value: "ZONE" },
  { label: "Area", value: "AREA" },
  { label: "Delivery method", value: "DELIVERY_METHOD" },
  { label: "First order only", value: "FIRST_ORDER" },
];

// V1-supported reward types only.
export const REWARD_TYPE_OPTIONS: { label: string; value: PromotionRewardType }[] = [
  { label: "Fixed discount (AED off)", value: "FIXED_DISCOUNT" },
  { label: "Percentage discount", value: "PERCENTAGE_DISCOUNT" },
  { label: "Free delivery", value: "FREE_DELIVERY" },
];
