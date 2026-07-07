import { Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CartId } from '../../common/decorators/cart-id.decorator';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Cart browsing/editing stays guest-accessible (see CartController) —
  // login is enforced right here, at the point the cart becomes an order.
  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  checkout(@CurrentUser() user: CurrentUserPayload, @CartId() cartId: string) {
    return this.ordersService.checkout(user.id, cartId);
  }
}
