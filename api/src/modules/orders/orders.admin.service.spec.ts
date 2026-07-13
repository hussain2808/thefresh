import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersAdminService } from './orders.admin.service';
import { WeightAdjustmentService } from '../weight-adjustment/weight-adjustment.service';
import { WeighOrderDto } from './dto/weigh-order.dto';

const ACTOR = { id: 'admin-1', role: 'ADMIN' };

function weightOrderItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    orderId: 'order-1',
    variantId: 'variant-1',
    storeId: 'store-1',
    quantity: null,
    weightGrams: 1000,
    prepOptionId: null,
    estimatedPriceFils: 10000,
    basePriceFils: 10000,
    weightModifierPercent: 0,
    prepChargeFils: 0,
    actualWeightGrams: null,
    finalPriceFils: null,
    varianceBasisPoints: null,
    ...overrides,
  };
}

describe('OrdersAdminService', () => {
  let prisma: {
    order: { findUnique: jest.Mock; update: jest.Mock };
    orderItem: { update: jest.Mock };
    orderStatusHistory: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let ordersAdmin: OrdersAdminService;

  function mockOrder(overrides: Record<string, unknown> = {}) {
    return {
      id: 'order-1',
      customerId: 'customer-1',
      status: OrderStatus.PLACED,
      totalFils: 10000,
      items: [weightOrderItem()],
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      order: { findUnique: jest.fn(), update: jest.fn() },
      orderItem: { update: jest.fn() },
      orderStatusHistory: { create: jest.fn() },
      $transaction: jest.fn((fn) =>
        fn({
          order: prisma.order,
          orderItem: prisma.orderItem,
          orderStatusHistory: prisma.orderStatusHistory,
        }),
      ),
    };
    ordersAdmin = new OrdersAdminService(prisma as any, new WeightAdjustmentService());
  });

  describe('accept', () => {
    it('transitions PLACED -> ACCEPTED and writes a status history row', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder());

      await ordersAdmin.accept('order-1', ACTOR);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.ACCEPTED },
      });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-1',
          from: OrderStatus.PLACED,
          to: OrderStatus.ACCEPTED,
          actorId: 'admin-1',
          actorRole: 'ADMIN',
          reason: undefined,
        },
      });
    });

    it('rejects an illegal transition', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.DELIVERED }));

      await expect(ordersAdmin.accept('order-1', ACTOR)).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a missing order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(ordersAdmin.accept('missing', ACTOR)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('transitions PLACED -> REJECTED carrying the reason', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder());

      await ordersAdmin.reject('order-1', ACTOR, 'Out of stock');

      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ to: OrderStatus.REJECTED, reason: 'Out of stock' }),
      });
    });
  });

  describe('startProcessing', () => {
    it('transitions ACCEPTED -> PROCESSING', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.ACCEPTED }));

      await ordersAdmin.startProcessing('order-1', ACTOR);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.PROCESSING },
      });
    });
  });

  describe('weigh', () => {
    const dto: WeighOrderDto = { items: [{ orderItemId: 'item-1', actualWeightGrams: 1100 }] };

    it('rejects when a WEIGHT line is missing from the request', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.PROCESSING }));

      await expect(ordersAdmin.weigh('order-1', { items: [] }, ACTOR)).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects an actualWeightGrams entry for an item that is not a WEIGHT line on this order', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.PROCESSING }));

      await expect(
        ordersAdmin.weigh('order-1', { items: [...dto.items, { orderItemId: 'unknown-item', actualWeightGrams: 100 }] }, ACTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects weighing an order that is not in PROCESSING', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.PLACED }));

      await expect(ordersAdmin.weigh('order-1', dto, ACTOR)).rejects.toThrow(BadRequestException);
    });

    it('recomputes final price and variance, updates the item and order, and moves straight to AWAITING_PAYMENT', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.PROCESSING }));

      await ordersAdmin.weigh('order-1', dto, ACTOR);

      // 10000 fils/kg, no modifier, 1100g actual -> 11000 fils; requested 1000g -> +10% variance (1000 bps)
      expect(prisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { actualWeightGrams: 1100, finalPriceFils: 11000, varianceBasisPoints: 1000 },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { finalTotalFils: 11000 }, // totalFils 10000 + (11000 - 10000) delta
      });

      // Two transitions: PROCESSING -> WEIGHING, then WEIGHING -> AWAITING_PAYMENT
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ from: OrderStatus.PROCESSING, to: OrderStatus.WEIGHING }),
      });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ from: OrderStatus.WEIGHING, to: OrderStatus.AWAITING_PAYMENT }),
      });
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledTimes(2);
    });

    it('never touches non-WEIGHT lines (no basePriceFils snapshot)', async () => {
      const nonWeightItem = weightOrderItem({
        id: 'item-2',
        weightGrams: null,
        quantity: 2,
        basePriceFils: null,
        weightModifierPercent: null,
      });
      prisma.order.findUnique.mockResolvedValue(
        mockOrder({ status: OrderStatus.PROCESSING, items: [weightOrderItem(), nonWeightItem] }),
      );

      await ordersAdmin.weigh('order-1', dto, ACTOR);

      expect(prisma.orderItem.update).toHaveBeenCalledTimes(1);
      expect(prisma.orderItem.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'item-2' } }),
      );
    });
  });

  describe('markPaid', () => {
    it('transitions AWAITING_PAYMENT -> PAID', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.AWAITING_PAYMENT }));

      await ordersAdmin.markPaid('order-1', ACTOR);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.PAID },
      });
    });

    it('rejects marking an order paid before it awaits payment', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.PLACED }));

      await expect(ordersAdmin.markPaid('order-1', ACTOR)).rejects.toThrow(BadRequestException);
    });
  });

  describe('dispatch', () => {
    it('transitions PAID -> OUT_FOR_DELIVERY', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.PAID }));

      await ordersAdmin.dispatch('order-1', ACTOR);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.OUT_FOR_DELIVERY },
      });
    });
  });

  describe('deliver', () => {
    it('transitions OUT_FOR_DELIVERY -> DELIVERED', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.OUT_FOR_DELIVERY }));

      await ordersAdmin.deliver('order-1', ACTOR);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.DELIVERED },
      });
    });
  });

  describe('markDeliveryFailed', () => {
    it('transitions OUT_FOR_DELIVERY -> DELIVERY_FAILED carrying the reason', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.OUT_FOR_DELIVERY }));

      await ordersAdmin.markDeliveryFailed('order-1', ACTOR, 'Customer unreachable');

      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ to: OrderStatus.DELIVERY_FAILED, reason: 'Customer unreachable' }),
      });
    });
  });

  describe('cancel', () => {
    it.each([OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.AWAITING_PAYMENT])(
      'cancels an order in %s',
      async (status) => {
        prisma.order.findUnique.mockResolvedValue(mockOrder({ status }));

        await ordersAdmin.cancel('order-1', ACTOR, 'Customer requested');

        expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ from: status, to: OrderStatus.CANCELLED, reason: 'Customer requested' }),
        });
      },
    );

    it('rejects cancelling an order once it is PROCESSING', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder({ status: OrderStatus.PROCESSING }));

      await expect(ordersAdmin.cancel('order-1', ACTOR)).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });
});
