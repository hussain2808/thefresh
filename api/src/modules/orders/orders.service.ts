import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Order, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ZoneDeliveryService } from '../delivery/zone-delivery.service';
import { CouponsService } from '../promotions/coupons.service';
import { PricingService } from '../pricing/pricing.service';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly zoneDelivery: ZoneDeliveryService,
    private readonly coupons: CouponsService,
    private readonly pricing: PricingService,
  ) {}

  async checkout(customerId: string, cartId: string, dto: CheckoutDto): Promise<Order> {
    const cart = await this.cartService.getCart(cartId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const { area, zone, methods } = await this.zoneDelivery.resolveZoneForArea(dto.areaId);
    const method = methods.find((m) => m.id === dto.deliveryMethodId);
    if (!method) {
      throw new BadRequestException(`Delivery method ${dto.deliveryMethodId} is not available in this area`);
    }
    if (cart.subtotalFils < method.minimumOrderAmountFils) {
      throw new BadRequestException(
        `Minimum order for ${method.name} is ${method.minimumOrderAmountFils} fils`,
      );
    }

    let slotDate: Date | undefined;
    let slotStart: number | undefined;
    let slotEnd: number | undefined;
    let slotCapacity: number | undefined;
    if (method.slots.length > 0) {
      if (!dto.slotId || !dto.slotDate) {
        throw new BadRequestException(`${method.name} requires a delivery slot`);
      }
      const slot = method.slots.find((s) => s.id === dto.slotId);
      if (!slot) throw new NotFoundException(`Slot ${dto.slotId} not found for ${method.name}`);
      if (slot.remaining <= 0) throw new BadRequestException('This delivery slot is fully booked');
      slotDate = new Date(dto.slotDate);
      slotStart = slot.startMinute;
      slotEnd = slot.endMinute;
      slotCapacity = slot.capacity;
    } else if (dto.slotId) {
      throw new BadRequestException(`${method.name} does not use delivery slots`);
    }

    let deliveryFeeFils =
      method.freeDeliveryAboveFils != null && cart.subtotalFils >= method.freeDeliveryAboveFils
        ? 0
        : method.feeFils;

    let discountFils = 0;
    let couponValidation: Awaited<ReturnType<CouponsService['validate']>> | undefined;
    if (dto.couponCode) {
      const isFirstOrder = (await this.prisma.order.count({ where: { customerId } })) === 0;
      couponValidation = await this.coupons.validate({
        code: dto.couponCode,
        customerId,
        subtotalFils: cart.subtotalFils,
        zoneId: zone.id,
        areaId: dto.areaId,
        deliveryMethodId: dto.deliveryMethodId,
        isFirstOrder,
      });
      if (!couponValidation.valid) {
        throw new BadRequestException(couponValidation.reason ?? 'Coupon is not valid');
      }
      discountFils = couponValidation.discountFils ?? 0;
      if (couponValidation.freeDelivery) deliveryFeeFils = 0;
    }

    const totalFils = Math.max(0, cart.subtotalFils - discountFils + deliveryFeeFils);

    // Snapshot the price breakdown (not just the total) so the Weight
    // Adjustment Engine can recompute finalPriceFils from actualWeightGrams
    // later without re-deriving from live catalog/store-listing state.
    const breakdowns = await Promise.all(
      cart.items.map((item) =>
        this.pricing.resolveBreakdown({
          variantId: item.variantId,
          storeId: item.storeId,
          weightGrams: item.weightGrams,
          quantity: item.quantity,
          prepOptionId: item.prepOptionId,
        }),
      ),
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId,
          status: OrderStatus.PLACED,
          subtotalFils: cart.subtotalFils,
          totalFils,
          items: {
            create: cart.items.map((item, index) => {
              const breakdown = breakdowns[index];
              const isWeightLine = breakdown.modifierPercent !== null;
              return {
                variantId: item.variantId,
                storeId: item.storeId,
                quantity: item.quantity,
                weightGrams: item.weightGrams,
                prepOptionId: item.prepOptionId,
                estimatedPriceFils: item.estimatedPriceFils,
                basePriceFils: isWeightLine ? breakdown.basePriceFils : null,
                weightModifierPercent: isWeightLine ? breakdown.modifierPercent : null,
                prepChargeFils: breakdown.prepChargeFils,
              };
            }),
          },
          deliverySnapshot: {
            create: {
              methodName: method.name,
              zoneName: zone.name,
              areaName: area.name,
              deliveryFeeFils,
              etaMinutes: method.estimatedDeliveryMinutes,
              slotDate,
              slotStart,
              slotEnd,
              deliveryAddress: dto.deliveryAddress,
            },
          },
        },
        include: { items: true, deliverySnapshot: true },
      });

      if (dto.couponCode && couponValidation?.valid) {
        const coupon = await tx.coupon.findUnique({ where: { code: dto.couponCode } });
        if (coupon) {
          await tx.couponRedemption.create({
            data: {
              promotionId: coupon.promotionId,
              couponCode: dto.couponCode,
              customerId,
              orderId: created.id,
              discountAmountFils: discountFils,
            },
          });
        }
      }

      if (dto.slotId) {
        // Re-check capacity inside the transaction (not just the earlier
        // read) to avoid a race between two concurrent checkouts landing
        // on the same slot.
        const bookingResult = await tx.deliverySlot.updateMany({
          where: { id: dto.slotId, bookedCount: { lt: slotCapacity } },
          data: { bookedCount: { increment: 1 } },
        });
        if (bookingResult.count === 0) {
          throw new BadRequestException('This delivery slot is fully booked');
        }
      }

      return created;
    });

    await this.cartService.clear(cartId);
    return order;
  }
}
