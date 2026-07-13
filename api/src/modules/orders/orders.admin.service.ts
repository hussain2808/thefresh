import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WeightAdjustmentService } from '../weight-adjustment/weight-adjustment.service';
import { AdjustLineInput } from '../weight-adjustment/weight-adjustment.util';
import { assertTransition } from './state-machine/order.machine';
import { WeighOrderDto } from './dto/weigh-order.dto';

interface Actor {
  id: string;
  role: string;
}

@Injectable()
export class OrdersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weightAdjustment: WeightAdjustmentService,
  ) {}

  async findAll() {
    const orders = await this.prisma.order.findMany({
      include: { items: true, deliverySnapshot: true },
      orderBy: { createdAt: 'desc' },
    });
    const withMeta = await this.attachCustomersAndCoupons(orders);
    // Product names on every order, not just findOne — the orders list's
    // inline "Record weights" action needs readable line-item names too.
    return this.attachProductNames(withMeta);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, deliverySnapshot: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const [withMeta] = await this.attachCustomersAndCoupons([order]);
    const [withProductNames] = await this.attachProductNames([withMeta]);

    // Bare orderId lookup, same non-FK convention as attachCustomersAndCoupons —
    // surfaces the audit trail the state machine has been writing all along.
    const history = await this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });

    return { ...withProductNames, history };
  }

  async accept(id: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrder(tx, id);
      await this.transition(tx, order.id, order.status, OrderStatus.ACCEPTED, actor);
      return tx.order.findUnique({ where: { id }, include: { items: true, deliverySnapshot: true } });
    });
  }

  async reject(id: string, actor: Actor, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrder(tx, id);
      await this.transition(tx, order.id, order.status, OrderStatus.REJECTED, actor, reason);
      return tx.order.findUnique({ where: { id }, include: { items: true, deliverySnapshot: true } });
    });
  }

  async startProcessing(id: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrder(tx, id);
      await this.transition(tx, order.id, order.status, OrderStatus.PROCESSING, actor);
      return tx.order.findUnique({ where: { id }, include: { items: true, deliverySnapshot: true } });
    });
  }

  /**
   * The Weight Adjustment Engine hookup: records actual weight for every
   * WEIGHT line on the order, recomputes each line's final price, and moves
   * the order PROCESSING -> WEIGHING -> AWAITING_PAYMENT. Every WEIGHT line
   * bills on actual weight, always — no tolerance config, no approval step
   * (see docs/catalog-design.md §1.5).
   */
  async weigh(id: string, dto: WeighOrderDto, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrder(tx, id);

      const weightLines = order.items.filter((item) => item.basePriceFils != null);
      const actualWeightByItemId = new Map(dto.items.map((i) => [i.orderItemId, i.actualWeightGrams]));

      const missing = weightLines.filter((item) => !actualWeightByItemId.has(item.id));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Missing actual weight for order item(s): ${missing.map((i) => i.id).join(', ')}`,
        );
      }
      const weightLineIds = new Set(weightLines.map((item) => item.id));
      const unknown = dto.items.filter((i) => !weightLineIds.has(i.orderItemId));
      if (unknown.length > 0) {
        throw new BadRequestException(
          `Order item(s) are not weighable lines on this order: ${unknown.map((i) => i.orderItemId).join(', ')}`,
        );
      }

      await this.transition(tx, order.id, order.status, OrderStatus.WEIGHING, actor);

      const inputs: AdjustLineInput[] = weightLines.map((item) => ({
        lineId: item.id,
        requestedWeightGrams: item.weightGrams as number,
        actualWeightGrams: actualWeightByItemId.get(item.id) as number,
        basePriceFils: item.basePriceFils as number,
        modifierPercent: item.weightModifierPercent as number,
        prepChargeFils: item.prepChargeFils,
      }));
      const adjustments = this.weightAdjustment.adjustLines(inputs);

      let finalTotalDelta = 0;
      for (const item of weightLines) {
        const adjustment = adjustments.find((a) => a.lineId === item.id);
        if (!adjustment) continue;
        finalTotalDelta += adjustment.finalPriceFils - item.estimatedPriceFils;
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            actualWeightGrams: actualWeightByItemId.get(item.id),
            finalPriceFils: adjustment.finalPriceFils,
            varianceBasisPoints: adjustment.varianceBasisPoints,
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { finalTotalFils: order.totalFils + finalTotalDelta },
      });

      await this.transition(tx, order.id, OrderStatus.WEIGHING, OrderStatus.AWAITING_PAYMENT, actor);

      return tx.order.findUnique({ where: { id }, include: { items: true, deliverySnapshot: true } });
    });
  }

  /**
   * Manual completion steps for a cash-on-delivery shop — payments and
   * rider assignment are still scaffold-only modules, so these are plain
   * staff-driven confirmations, not gateway/dispatch integrations.
   */
  async markPaid(id: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrder(tx, id);
      await this.transition(tx, order.id, order.status, OrderStatus.PAID, actor);
      return tx.order.findUnique({ where: { id }, include: { items: true, deliverySnapshot: true } });
    });
  }

  async dispatch(id: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrder(tx, id);
      await this.transition(tx, order.id, order.status, OrderStatus.OUT_FOR_DELIVERY, actor);
      return tx.order.findUnique({ where: { id }, include: { items: true, deliverySnapshot: true } });
    });
  }

  async deliver(id: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrder(tx, id);
      await this.transition(tx, order.id, order.status, OrderStatus.DELIVERED, actor);
      return tx.order.findUnique({ where: { id }, include: { items: true, deliverySnapshot: true } });
    });
  }

  async markDeliveryFailed(id: string, actor: Actor, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrder(tx, id);
      await this.transition(tx, order.id, order.status, OrderStatus.DELIVERY_FAILED, actor, reason);
      return tx.order.findUnique({ where: { id }, include: { items: true, deliverySnapshot: true } });
    });
  }

  /** Legal from PLACED, ACCEPTED, or AWAITING_PAYMENT only — assertTransition
   * rejects it from anywhere else (e.g. once PROCESSING has started). */
  async cancel(id: string, actor: Actor, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadOrder(tx, id);
      await this.transition(tx, order.id, order.status, OrderStatus.CANCELLED, actor, reason);
      return tx.order.findUnique({ where: { id }, include: { items: true, deliverySnapshot: true } });
    });
  }

  private async loadOrder(tx: Prisma.TransactionClient, id: string) {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  /**
   * Every order status change goes through here — validates the transition
   * table, writes the status, and appends an OrderStatusHistory row.
   * Nothing else in the codebase sets order.status directly.
   */
  private async transition(
    tx: Prisma.TransactionClient,
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    actor: Actor,
    reason?: string,
  ): Promise<void> {
    try {
      assertTransition(from, to);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    await tx.order.update({ where: { id: orderId }, data: { status: to } });
    await tx.orderStatusHistory.create({
      data: { orderId, from, to, actorId: actor.id, actorRole: actor.role, reason },
    });
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

  /** Resolves a display productName per line item — variantId is intentionally
   * bare (no FK) on OrderItem, same convention as attachCustomersAndCoupons. */
  private async attachProductNames<T extends { items: { variantId: string }[] }>(orders: T[]) {
    const variantIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.variantId)))];
    const variants = variantIds.length
      ? await this.prisma.variant.findMany({ where: { id: { in: variantIds } }, include: { family: true } })
      : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => {
        const variant = variantById.get(item.variantId);
        return {
          ...item,
          productName: variant ? `${variant.family.name} — ${variant.name}` : item.variantId,
        };
      }),
    }));
  }
}
