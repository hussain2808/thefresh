import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { PricingService } from '../pricing/pricing.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItem, CartView } from './cart.types';

const CART_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days — guest carts are cheap to let expire

@Injectable()
export class CartService {
  constructor(
    private readonly redis: RedisService,
    private readonly pricingService: PricingService,
  ) {}

  async getCart(cartId: string): Promise<CartView> {
    const items = await this.readItems(cartId);
    return this.priceCart(cartId, items);
  }

  async addItem(cartId: string, dto: AddCartItemDto): Promise<CartView> {
    // Validates the variant/store/weight/prep combination up front — pricing
    // is the single source of truth for what's a legal line item.
    await this.pricingService.estimatePrice(dto);

    const items = await this.readItems(cartId);
    items.push({
      id: crypto.randomUUID(),
      variantId: dto.variantId,
      storeId: dto.storeId,
      weightGrams: dto.weightGrams,
      quantity: dto.quantity,
      prepOptionId: dto.prepOptionId,
      addedAt: new Date().toISOString(),
    });

    await this.writeItems(cartId, items);
    return this.priceCart(cartId, items);
  }

  async updateItem(cartId: string, itemId: string, dto: UpdateCartItemDto): Promise<CartView> {
    const items = await this.readItems(cartId);
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }

    const updated: CartItem = {
      ...items[index],
      weightGrams: dto.weightGrams ?? items[index].weightGrams,
      quantity: dto.quantity ?? items[index].quantity,
      prepOptionId: dto.prepOptionId ?? items[index].prepOptionId,
    };
    await this.pricingService.estimatePrice({
      variantId: updated.variantId,
      storeId: updated.storeId,
      weightGrams: updated.weightGrams,
      quantity: updated.quantity,
      prepOptionId: updated.prepOptionId,
    });

    items[index] = updated;
    await this.writeItems(cartId, items);
    return this.priceCart(cartId, items);
  }

  async removeItem(cartId: string, itemId: string): Promise<void> {
    const items = await this.readItems(cartId);
    const remaining = items.filter((item) => item.id !== itemId);
    if (remaining.length === items.length) {
      throw new NotFoundException(`Cart item ${itemId} not found`);
    }
    await this.writeItems(cartId, remaining);
  }

  async clear(cartId: string): Promise<void> {
    await this.redis.del(this.key(cartId));
  }

  private async priceCart(cartId: string, items: CartItem[]): Promise<CartView> {
    const priced = await Promise.all(
      items.map(async (item) => ({
        ...item,
        estimatedPriceFils: await this.pricingService.estimatePrice({
          variantId: item.variantId,
          storeId: item.storeId,
          weightGrams: item.weightGrams,
          quantity: item.quantity,
          prepOptionId: item.prepOptionId,
        }),
      })),
    );

    return {
      cartId,
      items: priced,
      subtotalFils: priced.reduce((sum, item) => sum + item.estimatedPriceFils, 0),
    };
  }

  private async readItems(cartId: string): Promise<CartItem[]> {
    const raw = await this.redis.get(this.key(cartId));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  }

  private async writeItems(cartId: string, items: CartItem[]): Promise<void> {
    await this.redis.set(this.key(cartId), JSON.stringify(items), 'EX', CART_TTL_SECONDS);
  }

  private key(cartId: string): string {
    return `cart:${cartId}`;
  }
}
