import { PromotionCondition, PromotionConditionType } from '@prisma/client';
import { evaluateConditions } from './condition-evaluator.util';

function condition(conditionType: PromotionConditionType, value: unknown, operator = '='): PromotionCondition {
  return { id: 'c1', promotionId: 'p1', conditionType, operator, value } as PromotionCondition;
}

describe('evaluateConditions', () => {
  it('passes with no conditions', () => {
    expect(evaluateConditions([], { subtotalFils: 0 })).toBeNull();
  });

  it('passes MIN_ORDER_VALUE when subtotal meets the minimum', () => {
    const conditions = [condition(PromotionConditionType.MIN_ORDER_VALUE, 5000, '>=')];
    expect(evaluateConditions(conditions, { subtotalFils: 5000 })).toBeNull();
  });

  it('fails MIN_ORDER_VALUE when subtotal is below the minimum', () => {
    const conditions = [condition(PromotionConditionType.MIN_ORDER_VALUE, 5000, '>=')];
    expect(evaluateConditions(conditions, { subtotalFils: 4999 })).not.toBeNull();
  });

  it('passes ZONE when the basket zone matches', () => {
    const conditions = [condition(PromotionConditionType.ZONE, 'zone-1')];
    expect(evaluateConditions(conditions, { subtotalFils: 0, zoneId: 'zone-1' })).toBeNull();
  });

  it('fails ZONE when the basket zone does not match', () => {
    const conditions = [condition(PromotionConditionType.ZONE, 'zone-1')];
    expect(evaluateConditions(conditions, { subtotalFils: 0, zoneId: 'zone-2' })).not.toBeNull();
  });

  it('passes FIRST_ORDER when the basket is flagged as first order', () => {
    const conditions = [condition(PromotionConditionType.FIRST_ORDER, true)];
    expect(evaluateConditions(conditions, { subtotalFils: 0, isFirstOrder: true })).toBeNull();
  });

  it('fails FIRST_ORDER when the basket is not the first order', () => {
    const conditions = [condition(PromotionConditionType.FIRST_ORDER, true)];
    expect(evaluateConditions(conditions, { subtotalFils: 0, isFirstOrder: false })).not.toBeNull();
  });

  it('requires all conditions to pass (AND)', () => {
    const conditions = [
      condition(PromotionConditionType.MIN_ORDER_VALUE, 1000, '>='),
      condition(PromotionConditionType.ZONE, 'zone-1'),
    ];
    expect(evaluateConditions(conditions, { subtotalFils: 2000, zoneId: 'zone-2' })).not.toBeNull();
    expect(evaluateConditions(conditions, { subtotalFils: 2000, zoneId: 'zone-1' })).toBeNull();
  });

  it('throws for a condition type not yet supported', () => {
    const conditions = [condition(PromotionConditionType.CATEGORY, 'cat-1')];
    expect(() => evaluateConditions(conditions, { subtotalFils: 0 })).toThrow(/not yet supported/);
  });
});
