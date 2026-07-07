import { Body, Controller, Post } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Controller('promotions')
export class PromotionsPublicController {
  constructor(private readonly coupons: CouponsService) {}

  @Post('coupons/validate')
  validate(@Body() dto: ValidateCouponDto) {
    return this.coupons.validate(dto);
  }
}
