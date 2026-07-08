import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @IsString()
  areaId: string;

  @IsString()
  deliveryMethodId: string;

  // Required (validated in the service, not here) only when the chosen
  // method has slots — see OrdersService.checkout.
  @IsOptional()
  @IsString()
  slotId?: string;

  @IsOptional()
  @IsDateString()
  slotDate?: string;

  @IsString()
  deliveryAddress: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
