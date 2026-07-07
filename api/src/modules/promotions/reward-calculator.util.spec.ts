import { PromotionReward, PromotionRewardType } from '@prisma/client';
import { computeDiscount } from './reward-calculator.util';

function reward(rewardType: PromotionRewardType, value: number, maxDiscountFils?: number): PromotionReward {
  return { id: 'r1', promotionId: 'p1', rewardType, value, maxDiscountFils: maxDiscountFils ?? null } as PromotionReward;
}

describe('computeDiscount', () => {
  it('computes a fixed discount', () => {
    expect(computeDiscount(reward(PromotionRewardType.FIXED_DISCOUNT, 1000), 5000)).toBe(1000);
  });

  it('caps a fixed discount at the subtotal', () => {
    expect(computeDiscount(reward(PromotionRewardType.FIXED_DISCOUNT, 1000), 500)).toBe(500);
  });

  it('computes a percentage discount', () => {
    expect(computeDiscount(reward(PromotionRewardType.PERCENTAGE_DISCOUNT, 20), 10000)).toBe(2000);
  });

  it('caps a percentage discount at maxDiscountFils', () => {
    // 20% of 12000 = 2400, capped at 1500
    expect(computeDiscount(reward(PromotionRewardType.PERCENTAGE_DISCOUNT, 20, 1500), 12000)).toBe(1500);
  });

  it('does not cap a percentage discount when maxDiscountFils is unset', () => {
    expect(computeDiscount(reward(PromotionRewardType.PERCENTAGE_DISCOUNT, 20), 12000)).toBe(2400);
  });

  it('returns zero for FREE_DELIVERY (delivery fee handled by the caller)', () => {
    expect(computeDiscount(reward(PromotionRewardType.FREE_DELIVERY, 0), 5000)).toBe(0);
  });

  it('throws for cashback reward types (deferred)', () => {
    expect(() => computeDiscount(reward(PromotionRewardType.CASHBACK_FIXED, 1000), 5000)).toThrow(/deferred/);
  });
});
