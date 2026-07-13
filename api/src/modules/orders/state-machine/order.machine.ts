import { OrderStatus } from '@prisma/client';

// AWAITING_APPROVAL is a reserved, unused status — tolerance/approval workflows
// were cut from scope (see docs/catalog-design.md §1.5); every WEIGHT line
// bills on actual weight, always. Nothing transitions into it today.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: [OrderStatus.ACCEPTED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
  ACCEPTED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.WEIGHING],
  WEIGHING: [OrderStatus.AWAITING_PAYMENT],
  AWAITING_APPROVAL: [],
  AWAITING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.OUT_FOR_DELIVERY],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
  DELIVERY_FAILED: [],
};

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new Error(`Illegal order transition: ${from} -> ${to}`);
  }
}
