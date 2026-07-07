import { BadRequestException, Injectable } from '@nestjs/common';
import { Order, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  async checkout(customerId: string, cartId: string): Promise<Order> {
    const cart = await this.cartService.getCart(cartId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const order = await this.prisma.order.create({
      data: {
        customerId,
        status: OrderStatus.PLACED,
        subtotalFils: cart.subtotalFils,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            storeId: item.storeId,
            quantity: item.quantity,
            weightGrams: item.weightGrams,
            prepOptionId: item.prepOptionId,
            estimatedPriceFils: item.estimatedPriceFils,
          })),
        },
      },
      include: { items: true },
    });

    await this.cartService.clear(cartId);
    return order;
  }
}
