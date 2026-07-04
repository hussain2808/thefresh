import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SellingType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { selectWeightOption } from './weight-modifiers/weight-modifier.util';
import { computeEstimatedPrice } from './pricing.util';
import { Fils } from '../../common/types/money';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Estimated price for one line, in fils.
   * WEIGHT variants: listing price is per kg; quantity is expressed via
   * weightGrams (must match one of the variant's weight options).
   * Other selling types: listing price × quantity.
   */
  async estimatePrice(params: {
    variantId: string;
    storeId?: string;
    weightGrams?: number;
    quantity?: number;
    prepOptionId?: string;
  }): Promise<Fils> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: params.variantId },
      include: {
        weightOptions: true,
        family: { include: { prepOptions: true } },
        listings: params.storeId ? { where: { storeId: params.storeId } } : true,
      },
    });
    if (!variant) throw new NotFoundException(`Variant ${params.variantId} not found`);

    const listing = variant.listings.find((l) => l.enabled);
    if (!listing) throw new NotFoundException(`Variant ${variant.sku} has no enabled store listing`);

    let prepChargeFils = 0;
    if (params.prepOptionId) {
      const prepOption = variant.family.prepOptions.find((o) => o.id === params.prepOptionId);
      if (!prepOption) {
        throw new NotFoundException(`Preparation option ${params.prepOptionId} not found on ${variant.family.name}`);
      }
      prepChargeFils = prepOption.chargeFils;
    }

    if (variant.sellingType === SellingType.WEIGHT) {
      if (!params.weightGrams) throw new BadRequestException('weightGrams is required for WEIGHT variants');
      const weightOption = selectWeightOption(variant.weightOptions, params.weightGrams);
      return computeEstimatedPrice({
        basePriceFils: listing.priceFils,
        weightGrams: params.weightGrams,
        modifierPercent: weightOption.modifierPercent,
        prepChargeFils,
      });
    }

    const quantity = params.quantity ?? 1;
    if (quantity < 1) throw new BadRequestException('quantity must be ≥ 1');
    return listing.priceFils * quantity + prepChargeFils;
  }
}
