import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';

const AREA = { id: 'area-1', name: 'Marina' };
const ZONE = { id: 'zone-1', name: 'New Dubai' };

const FLAT_METHOD = {
  id: 'method-flat',
  name: 'Standard Delivery',
  feeFils: 500,
  minimumOrderAmountFils: 2000,
  freeDeliveryAboveFils: 10_000,
  estimatedDeliveryMinutes: 120,
  slots: [] as { id: string; startMinute: number; endMinute: number; capacity: number; remaining: number }[],
};

const SLOT_METHOD = {
  id: 'method-slot',
  name: 'Slot Based Delivery',
  feeFils: 500,
  minimumOrderAmountFils: 2000,
  freeDeliveryAboveFils: null as number | null,
  estimatedDeliveryMinutes: null as number | null,
  slots: [{ id: 'slot-1', startMinute: 600, endMinute: 720, capacity: 100, remaining: 5 }],
};

function baseDto(overrides: Partial<CheckoutDto> = {}): CheckoutDto {
  return {
    areaId: AREA.id,
    deliveryMethodId: FLAT_METHOD.id,
    deliveryAddress: '123 Main St',
    ...overrides,
  };
}

describe('OrdersService.checkout', () => {
  let prisma: {
    order: { create: jest.Mock; count: jest.Mock };
    coupon: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let cartService: { getCart: jest.Mock; clear: jest.Mock };
  let zoneDelivery: { resolveZoneForArea: jest.Mock };
  let coupons: { validate: jest.Mock };
  let ordersService: OrdersService;
  let txDeliverySlotUpdateMany: jest.Mock;
  let txCouponRedemptionCreate: jest.Mock;
  let txOrderCreate: jest.Mock;

  const cart = {
    cartId: 'cart-1',
    subtotalFils: 12000,
    items: [
      {
        id: 'item-1',
        variantId: 'variant-1',
        storeId: 'store-1',
        weightGrams: 500,
        quantity: undefined,
        prepOptionId: undefined,
        addedAt: '2026-07-07T00:00:00.000Z',
        estimatedPriceFils: 12000,
      },
    ],
  };

  beforeEach(() => {
    txOrderCreate = jest.fn().mockResolvedValue({ id: 'order-1', status: OrderStatus.PLACED });
    txCouponRedemptionCreate = jest.fn().mockResolvedValue({});
    txDeliverySlotUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

    prisma = {
      order: { create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      coupon: { findUnique: jest.fn() },
      $transaction: jest.fn(async (fn) =>
        fn({
          order: { create: txOrderCreate },
          couponRedemption: { create: txCouponRedemptionCreate },
          deliverySlot: { updateMany: txDeliverySlotUpdateMany },
          coupon: { findUnique: prisma.coupon.findUnique },
        }),
      ),
    };
    cartService = { getCart: jest.fn().mockResolvedValue(cart), clear: jest.fn().mockResolvedValue(undefined) };
    zoneDelivery = {
      resolveZoneForArea: jest.fn().mockResolvedValue({ area: AREA, zone: ZONE, methods: [FLAT_METHOD, SLOT_METHOD] }),
    };
    coupons = { validate: jest.fn() };
    ordersService = new OrdersService(prisma as any, cartService as any, zoneDelivery as any, coupons as any);
  });

  it('rejects checkout when the cart is empty', async () => {
    cartService.getCart.mockResolvedValue({ cartId: 'cart-1', items: [], subtotalFils: 0 });

    await expect(ordersService.checkout('user-1', 'cart-1', baseDto())).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects checkout when the delivery method is not available in the area', async () => {
    zoneDelivery.resolveZoneForArea.mockResolvedValue({ area: AREA, zone: ZONE, methods: [SLOT_METHOD] });

    await expect(
      ordersService.checkout('user-1', 'cart-1', baseDto({ deliveryMethodId: 'method-flat' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects checkout when the cart is below the minimum order amount', async () => {
    cartService.getCart.mockResolvedValue({ ...cart, subtotalFils: 500 });

    await expect(ordersService.checkout('user-1', 'cart-1', baseDto())).rejects.toThrow(BadRequestException);
  });

  it('rejects checkout when the chosen slot is fully booked', async () => {
    const fullMethod = { ...SLOT_METHOD, slots: [{ ...SLOT_METHOD.slots[0], remaining: 0 }] };
    zoneDelivery.resolveZoneForArea.mockResolvedValue({ area: AREA, zone: ZONE, methods: [fullMethod] });

    await expect(
      ordersService.checkout(
        'user-1',
        'cart-1',
        baseDto({ deliveryMethodId: fullMethod.id, slotId: 'slot-1', slotDate: '2026-07-10' }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects checkout when a slot-based method is chosen without a slot', async () => {
    await expect(
      ordersService.checkout('user-1', 'cart-1', baseDto({ deliveryMethodId: SLOT_METHOD.id })),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an invalid coupon', async () => {
    coupons.validate.mockResolvedValue({ valid: false, reason: 'Coupon not found' });

    await expect(
      ordersService.checkout('user-1', 'cart-1', baseDto({ couponCode: 'NOPE' })),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('applies a valid coupon discount to the order total', async () => {
    cartService.getCart.mockResolvedValue({ ...cart, subtotalFils: 8000 }); // below the 10000 free-delivery threshold
    coupons.validate.mockResolvedValue({ valid: true, discountFils: 1000, freeDelivery: false });
    prisma.coupon.findUnique.mockResolvedValue({ promotionId: 'promo-1', code: 'SAVE10' });

    await ordersService.checkout('user-1', 'cart-1', baseDto({ couponCode: 'SAVE10' }));

    // subtotal 8000 - discount 1000 + fee 500
    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subtotalFils: 8000, totalFils: 7500 }) }),
    );
    expect(txCouponRedemptionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        promotionId: 'promo-1',
        couponCode: 'SAVE10',
        customerId: 'user-1',
        orderId: 'order-1',
        discountAmountFils: 1000,
      }),
    });
  });

  it('zeroes the delivery fee when the coupon grants free delivery', async () => {
    cartService.getCart.mockResolvedValue({ ...cart, subtotalFils: 8000 }); // below the free-delivery threshold
    coupons.validate.mockResolvedValue({ valid: true, discountFils: 0, freeDelivery: true });
    prisma.coupon.findUnique.mockResolvedValue({ promotionId: 'promo-1', code: 'FREESHIP' });

    await ordersService.checkout('user-1', 'cart-1', baseDto({ couponCode: 'FREESHIP' }));

    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalFils: 8000,
          deliverySnapshot: expect.objectContaining({ create: expect.objectContaining({ deliveryFeeFils: 0 }) }),
        }),
      }),
    );
  });

  it('waives the delivery fee once the subtotal clears the free-delivery threshold', async () => {
    cartService.getCart.mockResolvedValue({ ...cart, subtotalFils: 15000 });

    await ordersService.checkout('user-1', 'cart-1', baseDto());

    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliverySnapshot: expect.objectContaining({ create: expect.objectContaining({ deliveryFeeFils: 0 }) }),
        }),
      }),
    );
  });

  it('creates an order with a delivery snapshot, books the slot, and clears the cart', async () => {
    const order = await ordersService.checkout(
      'user-1',
      'cart-1',
      baseDto({ deliveryMethodId: SLOT_METHOD.id, slotId: 'slot-1', slotDate: '2026-07-10' }),
    );

    expect(txOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'user-1',
          status: OrderStatus.PLACED,
          subtotalFils: 12000,
          totalFils: 12500,
          deliverySnapshot: expect.objectContaining({
            create: expect.objectContaining({
              methodName: SLOT_METHOD.name,
              zoneName: ZONE.name,
              areaName: AREA.name,
              deliveryFeeFils: 500,
              slotStart: 600,
              slotEnd: 720,
            }),
          }),
        }),
      }),
    );
    expect(txDeliverySlotUpdateMany).toHaveBeenCalledWith({
      where: { id: 'slot-1', bookedCount: { lt: 100 } },
      data: { bookedCount: { increment: 1 } },
    });
    expect(cartService.clear).toHaveBeenCalledWith('cart-1');
    expect(order).toEqual({ id: 'order-1', status: OrderStatus.PLACED });
  });

  it('rejects when the slot no longer exists on the resolved method', async () => {
    await expect(
      ordersService.checkout(
        'user-1',
        'cart-1',
        baseDto({ deliveryMethodId: SLOT_METHOD.id, slotId: 'missing-slot', slotDate: '2026-07-10' }),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
