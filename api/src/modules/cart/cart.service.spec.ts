import { NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';

describe('CartService', () => {
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let pricingService: { estimatePrice: jest.Mock };
  let cartService: CartService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    redis = {
      get: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      set: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve('OK');
      }),
      del: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve(1);
      }),
    };
    pricingService = { estimatePrice: jest.fn().mockResolvedValue(5000) };

    cartService = new CartService(redis as any, pricingService as any);
  });

  it('returns an empty cart when nothing has been added yet', async () => {
    const cart = await cartService.getCart('cart-1');
    expect(cart).toEqual({ cartId: 'cart-1', items: [], subtotalFils: 0 });
  });

  it('adds an item, validating it against pricing first, and prices the cart', async () => {
    const cart = await cartService.addItem('cart-1', {
      variantId: 'variant-1',
      storeId: 'store-1',
      weightGrams: 500,
    });

    expect(pricingService.estimatePrice).toHaveBeenCalledWith({
      variantId: 'variant-1',
      storeId: 'store-1',
      weightGrams: 500,
      quantity: undefined,
      prepOptionId: undefined,
    });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].estimatedPriceFils).toBe(5000);
    expect(cart.subtotalFils).toBe(5000);
  });

  it('sums estimated prices across multiple items for the subtotal', async () => {
    pricingService.estimatePrice.mockResolvedValueOnce(3000).mockResolvedValueOnce(7000);
    await cartService.addItem('cart-1', { variantId: 'v1', storeId: 's1', quantity: 1 });
    const cart = await cartService.addItem('cart-1', { variantId: 'v2', storeId: 's1', quantity: 2 });

    expect(cart.items).toHaveLength(2);
    expect(cart.subtotalFils).toBe(10000);
  });

  it('updates an item and re-validates the new combination against pricing', async () => {
    const added = await cartService.addItem('cart-1', {
      variantId: 'v1',
      storeId: 's1',
      weightGrams: 500,
    });
    const itemId = added.items[0].id;

    await cartService.updateItem('cart-1', itemId, { weightGrams: 1000 });

    expect(pricingService.estimatePrice).toHaveBeenLastCalledWith(
      expect.objectContaining({ weightGrams: 1000 }),
    );
  });

  it('throws when updating an item that does not exist', async () => {
    await expect(cartService.updateItem('cart-1', 'missing', { quantity: 2 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('removes an item from the cart', async () => {
    const added = await cartService.addItem('cart-1', { variantId: 'v1', storeId: 's1', quantity: 1 });
    const itemId = added.items[0].id;

    await cartService.removeItem('cart-1', itemId);
    const cart = await cartService.getCart('cart-1');

    expect(cart.items).toHaveLength(0);
  });

  it('throws when removing an item that does not exist', async () => {
    await expect(cartService.removeItem('cart-1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('clears the cart entirely', async () => {
    await cartService.addItem('cart-1', { variantId: 'v1', storeId: 's1', quantity: 1 });
    await cartService.clear('cart-1');

    const cart = await cartService.getCart('cart-1');
    expect(cart.items).toHaveLength(0);
  });
});
