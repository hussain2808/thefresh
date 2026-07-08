import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrdersAdminService } from './orders.admin.service';

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
}
