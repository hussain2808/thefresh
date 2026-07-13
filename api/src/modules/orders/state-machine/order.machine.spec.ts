import { OrderStatus } from '@prisma/client';
import { assertTransition } from './order.machine';

describe('assertTransition', () => {
  it('allows each documented step of the happy path', () => {
    expect(() => assertTransition(OrderStatus.PLACED, OrderStatus.ACCEPTED)).not.toThrow();
    expect(() => assertTransition(OrderStatus.ACCEPTED, OrderStatus.PROCESSING)).not.toThrow();
    expect(() => assertTransition(OrderStatus.PROCESSING, OrderStatus.WEIGHING)).not.toThrow();
    expect(() => assertTransition(OrderStatus.WEIGHING, OrderStatus.AWAITING_PAYMENT)).not.toThrow();
    expect(() => assertTransition(OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID)).not.toThrow();
    expect(() => assertTransition(OrderStatus.PAID, OrderStatus.OUT_FOR_DELIVERY)).not.toThrow();
    expect(() => assertTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)).not.toThrow();
  });

  it('allows cancellation from PLACED, ACCEPTED, and AWAITING_PAYMENT', () => {
    expect(() => assertTransition(OrderStatus.PLACED, OrderStatus.CANCELLED)).not.toThrow();
    expect(() => assertTransition(OrderStatus.ACCEPTED, OrderStatus.CANCELLED)).not.toThrow();
    expect(() => assertTransition(OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED)).not.toThrow();
  });

  it('allows rejection only from PLACED', () => {
    expect(() => assertTransition(OrderStatus.PLACED, OrderStatus.REJECTED)).not.toThrow();
    expect(() => assertTransition(OrderStatus.ACCEPTED, OrderStatus.REJECTED)).toThrow(
      /Illegal order transition/,
    );
  });

  it('never routes into AWAITING_APPROVAL — tolerance/approval is out of scope', () => {
    expect(() => assertTransition(OrderStatus.WEIGHING, OrderStatus.AWAITING_APPROVAL)).toThrow(
      /Illegal order transition/,
    );
  });

  it('rejects skipping steps', () => {
    expect(() => assertTransition(OrderStatus.PLACED, OrderStatus.PAID)).toThrow(
      'Illegal order transition: PLACED -> PAID',
    );
    expect(() => assertTransition(OrderStatus.PLACED, OrderStatus.PROCESSING)).toThrow(
      /Illegal order transition/,
    );
  });

  it('rejects any transition out of terminal states', () => {
    expect(() => assertTransition(OrderStatus.DELIVERED, OrderStatus.PLACED)).toThrow(
      /Illegal order transition/,
    );
    expect(() => assertTransition(OrderStatus.CANCELLED, OrderStatus.PLACED)).toThrow(
      /Illegal order transition/,
    );
    expect(() => assertTransition(OrderStatus.REJECTED, OrderStatus.ACCEPTED)).toThrow(
      /Illegal order transition/,
    );
    expect(() => assertTransition(OrderStatus.DELIVERY_FAILED, OrderStatus.OUT_FOR_DELIVERY)).toThrow(
      /Illegal order transition/,
    );
  });
});
