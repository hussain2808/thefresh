import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [PricingModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
