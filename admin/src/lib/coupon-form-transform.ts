import { toFils } from "@/lib/money";
import type { PromotionConditionType, PromotionRewardType } from "@/types/promotions";

interface RawCondition {
  conditionType: PromotionConditionType;
  value: string;
}

interface RawReward {
  rewardType: PromotionRewardType;
  value?: number;
  maxDiscountFils?: number;
}

export interface CouponFormValues {
  name: string;
  description?: string;
  code: string;
  reward: RawReward;
  conditions?: RawCondition[];
  startAt?: { toISOString: () => string };
  endAt?: { toISOString: () => string };
  priority?: number;
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
}

function parseConditionValue(conditionType: PromotionConditionType, raw: string): unknown {
  switch (conditionType) {
    case "MIN_ORDER_VALUE":
      return toFils(Number(raw));
    case "FIRST_ORDER":
      return raw === "true" || raw === "1";
    default:
      return raw;
  }
}

/** Converts the coupon form's AED-denominated, string-typed condition values into the fils/typed API payload. */
export function toCouponPayload(values: CouponFormValues) {
  const rewardType = values.reward.rewardType;
  const reward = {
    rewardType,
    value:
      rewardType === "FREE_DELIVERY"
        ? 0
        : rewardType === "PERCENTAGE_DISCOUNT"
          ? (values.reward.value ?? 0)
          : toFils(values.reward.value ?? 0),
    maxDiscountFils:
      rewardType === "PERCENTAGE_DISCOUNT" && values.reward.maxDiscountFils != null
        ? toFils(values.reward.maxDiscountFils)
        : undefined,
  };

  const conditions = (values.conditions ?? []).map((c) => ({
    conditionType: c.conditionType,
    operator: "=",
    value: parseConditionValue(c.conditionType, c.value),
  }));

  return {
    name: values.name,
    description: values.description,
    code: values.code,
    reward,
    conditions,
    startAt: values.startAt?.toISOString(),
    endAt: values.endAt?.toISOString(),
    priority: values.priority,
    usageLimit: values.usageLimit,
    perUserLimit: values.perUserLimit,
    isActive: values.isActive,
  };
}
