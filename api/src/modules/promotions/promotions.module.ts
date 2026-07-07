import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsAdminController } from './promotions.admin.controller';
import { PromotionsPublicController } from './promotions.public.controller';

@Module({
  controllers: [CouponsAdminController, PromotionsPublicController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class PromotionsModule {}
