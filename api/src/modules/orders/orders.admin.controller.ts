import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { OrdersAdminService } from './orders.admin.service';
import { OrderReasonDto, WeighOrderDto } from './dto/weigh-order.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/orders')
export class OrdersAdminController {
  constructor(private readonly ordersAdmin: OrdersAdminService) {}

  @Get()
  findAll() {
    return this.ordersAdmin.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersAdmin.findOne(id);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.ordersAdmin.accept(id, user);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: OrderReasonDto) {
    return this.ordersAdmin.reject(id, user, dto.reason);
  }

  @Post(':id/start-processing')
  startProcessing(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.ordersAdmin.startProcessing(id, user);
  }

  @Post(':id/weigh')
  weigh(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: WeighOrderDto) {
    return this.ordersAdmin.weigh(id, dto, user);
  }

  @Post(':id/mark-paid')
  markPaid(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.ordersAdmin.markPaid(id, user);
  }

  @Post(':id/dispatch')
  dispatch(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.ordersAdmin.dispatch(id, user);
  }

  @Post(':id/deliver')
  deliver(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.ordersAdmin.deliver(id, user);
  }

  @Post(':id/delivery-failed')
  markDeliveryFailed(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: OrderReasonDto) {
    return this.ordersAdmin.markDeliveryFailed(id, user, dto.reason);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: OrderReasonDto) {
    return this.ordersAdmin.cancel(id, user, dto.reason);
  }
}
