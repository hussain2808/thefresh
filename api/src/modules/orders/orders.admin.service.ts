import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const orders = await this.prisma.order.findMany({
      include: { items: true, deliverySnapshot: true },
      orderBy: { createdAt: 'desc' },
    });
    return this.attachCustomersAndCoupons(orders);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, deliverySnapshot: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const [withMeta] = await this.attachCustomersAndCoupons([order]);

    const variantIds = [...new Set(order.items.map((item) => item.variantId))];
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds } },
      include: { family: true },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    return {
      ...withMeta,
      items: order.items.map((item) => {
        const variant = variantById.get(item.variantId);
        return {
          ...item,
          productName: variant ? `${variant.family.name} — ${variant.name}` : item.variantId,
        };
      }),
    };
  }

  /** Attaches a resolved `customer` and `coupon` (if redeemed) to each order — both variantId and
   * customerId are intentionally bare (no FK), same convention as StockMovement.actorId, so this
   * resolves display names via batched lookups rather than a join. */
  private async attachCustomersAndCoupons<T extends { id: string; customerId: string }>(orders: T[]) {
    if (orders.length === 0) return [];

    const customerIds = [...new Set(orders.map((o) => o.customerId))];
    const orderIds = orders.map((o) => o.id);

    const [customers, redemptions] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: customerIds } } }),
      this.prisma.couponRedemption.findMany({ where: { orderId: { in: orderIds } } }),
    ]);
    const customerById = new Map(customers.map((c) => [c.id, c]));
    const redemptionByOrderId = new Map(redemptions.map((r) => [r.orderId as string, r]));

    return orders.map((order) => {
      const customer = customerById.get(order.customerId);
      const redemption = redemptionByOrderId.get(order.id);
      return {
        ...order,
        customer: customer
          ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone }
          : null,
        coupon: redemption
          ? { code: redemption.couponCode, discountAmountFils: redemption.discountAmountFils }
          : null,
      };
    });
  }
}
