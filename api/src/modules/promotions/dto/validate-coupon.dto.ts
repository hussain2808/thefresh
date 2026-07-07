import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

// Stateless basket payload — no persisted Cart model yet (see
// docs/promotions-design.md). The client states everything the condition
// evaluator needs to check, including isFirstOrder, since there's no
// Orders module yet to derive it from order history.
export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsString()
  customerId: string;

  @IsInt()
  @Min(0)
  subtotalFils: number;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsOptional()
  @IsString()
  deliveryMethodId?: string;

  @IsOptional()
  @IsBoolean()
  isFirstOrder?: boolean;
}
