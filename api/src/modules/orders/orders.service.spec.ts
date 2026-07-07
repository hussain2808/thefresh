import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let prisma: { order: { create: jest.Mock } };
  let cartService: { getCart: jest.Mock; clear: jest.Mock };
  let ordersService: OrdersService;

  beforeEach(() => {
    prisma = { order: { create: jest.fn() } };
    cartService = { getCart: jest.fn(), clear: jest.fn().mockResolvedValue(undefined) };
    ordersService = new OrdersService(prisma as any, cartService as any);
  });

  it('rejects checkout when the cart is empty', async () => {
    cartService.getCart.mockResolvedValue({ cartId: 'cart-1', items: [], subtotalFils: 0 });

    await expect(ordersService.checkout('user-1', 'cart-1')).rejects.toThrow(BadRequestException);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('creates an order snapshotting cart items and clears the cart', async () => {
    cartService.getCart.mockResolvedValue({
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
    });
    const createdOrder = { id: 'order-1', status: OrderStatus.PLACED, subtotalFils: 12000 };
    prisma.order.create.mockResolvedValue(createdOrder);

    const result = await ordersService.checkout('user-1', 'cart-1');

    expect(prisma.order.create).toHaveBeenCalledWith({
      data: {
        customerId: 'user-1',
        status: OrderStatus.PLACED,
        subtotalFils: 12000,
        items: {
          create: [
            {
              variantId: 'variant-1',
              storeId: 'store-1',
              quantity: undefined,
              weightGrams: 500,
              prepOptionId: undefined,
              estimatedPriceFils: 12000,
            },
          ],
        },
      },
      include: { items: true },
    });
    expect(cartService.clear).toHaveBeenCalledWith('cart-1');
    expect(result).toBe(createdOrder);
  });
});
