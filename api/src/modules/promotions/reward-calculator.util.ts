import { PromotionReward, PromotionRewardType } from '@prisma/client';

/** Discount in fils for a basket subtotal, given one reward row. */
export function computeDiscount(reward: PromotionReward, subtotalFils: number): number {
  switch (reward.rewardType) {
    case PromotionRewardType.FIXED_DISCOUNT:
      return Math.min(reward.value, subtotalFils);
    case PromotionRewardType.PERCENTAGE_DISCOUNT: {
      const raw = Math.round((subtotalFils * reward.value) / 100);
      return reward.maxDiscountFils != null ? Math.min(raw, reward.maxDiscountFils) : raw;
    }
    case PromotionRewardType.FREE_DELIVERY:
      // Delivery fee isn't known to this pure calculator — the caller
      // (coupons.service) resolves the actual fee and reports it
      // separately; this reward type contributes zero to the basket
      // discount itself.
      return 0;
    case PromotionRewardType.CASHBACK_FIXED:
    case PromotionRewardType.CASHBACK_PERCENTAGE:
      throw new Error(`Reward type ${reward.rewardType} is not yet supported (Cashback is deferred)`);
    default:
      throw new Error(`Reward type ${reward.rewardType} is not yet supported`);
  }
}
