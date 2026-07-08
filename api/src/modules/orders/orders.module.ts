import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminService } from './orders.admin.service';
import { OrdersAdminController } from './orders.admin.controller';

@Module({
  imports: [CartModule, DeliveryModule, PromotionsModule],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService, OrdersAdminService],
  exports: [OrdersService],
})
export class OrdersModule {}
