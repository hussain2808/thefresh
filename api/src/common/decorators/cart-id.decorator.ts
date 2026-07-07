import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Guest carts have no user identity yet — the Flutter app generates a UUID on
 * first launch and sends it as X-Cart-Id on every cart/checkout request.
 */
export const CartId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const cartId = request.headers['x-cart-id'];
  if (!cartId || typeof cartId !== 'string') {
    throw new BadRequestException('X-Cart-Id header is required');
  }
  return cartId;
});
