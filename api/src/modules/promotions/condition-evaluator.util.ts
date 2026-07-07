import { PromotionCondition, PromotionConditionType } from '@prisma/client';

export interface ConditionBasket {
  subtotalFils: number;
  zoneId?: string;
  areaId?: string;
  deliveryMethodId?: string;
  isFirstOrder?: boolean;
}

// V1-supported condition types (see docs/promotions-design.md §4). Types
// beyond these exist in the schema but aren't evaluated yet.
const SUPPORTED_TYPES: PromotionConditionType[] = [
  PromotionConditionType.MIN_ORDER_VALUE,
  PromotionConditionType.ZONE,
  PromotionConditionType.AREA,
  PromotionConditionType.DELIVERY_METHOD,
  PromotionConditionType.FIRST_ORDER,
];

/** Returns a failure reason string, or null if the condition passes. */
function evaluateOne(condition: PromotionCondition, basket: ConditionBasket): string | null {
  switch (condition.conditionType) {
    case PromotionConditionType.MIN_ORDER_VALUE: {
      const min = Number(condition.value);
      return basket.subtotalFils >= min ? null : `Minimum order value not met (requires ${min} fils)`;
    }
    case PromotionConditionType.ZONE: {
      const allowed = condition.value as string;
      return basket.zoneId === allowed ? null : 'Not available in this zone';
    }
    case PromotionConditionType.AREA: {
      const allowed = condition.value as string;
      return basket.areaId === allowed ? null : 'Not available in this area';
    }
    case PromotionConditionType.DELIVERY_METHOD: {
      const allowed = condition.value as string;
      return basket.deliveryMethodId === allowed ? null : 'Not available for this delivery method';
    }
    case PromotionConditionType.FIRST_ORDER: {
      return basket.isFirstOrder ? null : 'Only valid on your first order';
    }
    default:
      throw new Error(`Condition type ${condition.conditionType} is not yet supported`);
  }
}

/** All conditions must pass (AND). Returns the first failure reason, or null if eligible. */
export function evaluateConditions(conditions: PromotionCondition[], basket: ConditionBasket): string | null {
  for (const condition of conditions) {
    if (!SUPPORTED_TYPES.includes(condition.conditionType)) {
      throw new Error(`Condition type ${condition.conditionType} is not yet supported`);
    }
    const failure = evaluateOne(condition, basket);
    if (failure) return failure;
  }
  return null;
}
