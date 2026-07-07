import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PromotionRewardType, PromotionStatus, PromotionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { evaluateConditions } from './condition-evaluator.util';
import { computeDiscount } from './reward-calculator.util';

const couponInclude = { promotion: { include: { conditions: true, rewards: true } } };

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.coupon.findMany({
      include: couponInclude,
      orderBy: { promotion: { createdAt: 'desc' } },
    });
  }

  async findOne(promotionId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { promotionId }, include: couponInclude });
    if (!coupon) throw new NotFoundException(`Coupon ${promotionId} not found`);
    return coupon;
  }

  async create(dto: CreateCouponDto) {
    await this.assertCodeFree(dto.code);
    const promotion = await this.prisma.promotion.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: PromotionType.COUPON,
        status: dto.isActive === false ? PromotionStatus.PAUSED : PromotionStatus.ACTIVE,
        startAt: dto.startAt,
        endAt: dto.endAt,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
        conditions: { create: dto.conditions.map((c) => ({ ...c, value: c.value as object })) },
        rewards: { create: [{ ...dto.reward }] },
        coupon: {
          create: { code: dto.code, usageLimit: dto.usageLimit, perUserLimit: dto.perUserLimit },
        },
      },
    });
    return this.findOne(promotion.id);
  }

  async update(promotionId: string, dto: UpdateCouponDto) {
    await this.findOne(promotionId);
    if (dto.code) await this.assertCodeFree(dto.code, promotionId);

    await this.prisma.$transaction(async (tx) => {
      await tx.promotion.update({
        where: { id: promotionId },
        data: {
          name: dto.name,
          description: dto.description,
          status: dto.isActive === false ? PromotionStatus.PAUSED : dto.isActive ? PromotionStatus.ACTIVE : undefined,
          startAt: dto.startAt,
          endAt: dto.endAt,
          priority: dto.priority,
          isActive: dto.isActive,
        },
      });

      if (dto.conditions) {
        await tx.promotionCondition.deleteMany({ where: { promotionId } });
        await tx.promotionCondition.createMany({
          data: dto.conditions.map((c) => ({ ...c, promotionId, value: c.value as object })),
        });
      }

      if (dto.reward) {
        await tx.promotionReward.deleteMany({ where: { promotionId } });
        await tx.promotionReward.create({ data: { ...dto.reward, promotionId } });
      }

      if (dto.code || dto.usageLimit !== undefined || dto.perUserLimit !== undefined) {
        await tx.coupon.update({
          where: { promotionId },
          data: { code: dto.code, usageLimit: dto.usageLimit, perUserLimit: dto.perUserLimit },
        });
      }
    });

    return this.findOne(promotionId);
  }

  async remove(promotionId: string) {
    await this.findOne(promotionId);
    return this.prisma.promotion.delete({ where: { id: promotionId } });
  }

  async validate(dto: ValidateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
      include: couponInclude,
    });
    if (!coupon) return { valid: false, reason: 'Coupon not found' };

    const { promotion } = coupon;
    const now = new Date();
    if (promotion.status !== PromotionStatus.ACTIVE) {
      return { valid: false, reason: 'Coupon is not active' };
    }
    if (promotion.startAt && now < promotion.startAt) {
      return { valid: false, reason: 'Coupon is not yet valid' };
    }
    if (promotion.endAt && now > promotion.endAt) {
      return { valid: false, reason: 'Coupon has expired' };
    }

    const conditionFailure = evaluateConditions(promotion.conditions, {
      subtotalFils: dto.subtotalFils,
      zoneId: dto.zoneId,
      areaId: dto.areaId,
      deliveryMethodId: dto.deliveryMethodId,
      isFirstOrder: dto.isFirstOrder,
    });
    if (conditionFailure) return { valid: false, reason: conditionFailure };

    if (coupon.usageLimit != null) {
      const totalRedemptions = await this.prisma.couponRedemption.count({
        where: { promotionId: promotion.id },
      });
      if (totalRedemptions >= coupon.usageLimit) {
        return { valid: false, reason: 'Coupon usage limit reached' };
      }
    }

    if (coupon.perUserLimit != null) {
      const customerRedemptions = await this.prisma.couponRedemption.count({
        where: { promotionId: promotion.id, customerId: dto.customerId },
      });
      if (customerRedemptions >= coupon.perUserLimit) {
        return { valid: false, reason: 'You have already used this coupon' };
      }
    }

    const reward = promotion.rewards[0];
    if (!reward) return { valid: false, reason: 'Coupon has no reward configured' };

    const discountFils = computeDiscount(reward, dto.subtotalFils);
    const freeDelivery = reward.rewardType === PromotionRewardType.FREE_DELIVERY;

    return { valid: true, discountFils, freeDelivery };
  }

  private async assertCodeFree(code: string, exceptPromotionId?: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing && existing.promotionId !== exceptPromotionId) {
      throw new ConflictException(`Coupon code "${code}" already in use`);
    }
  }
}
