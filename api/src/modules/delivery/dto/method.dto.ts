import { PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateDeliveryMethodDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsInt()
  @Min(0)
  feeFils: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumOrderAmountFils?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  freeDeliveryAboveFils?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDeliveryMinutes?: number;
}

export class UpdateDeliveryMethodDto extends PartialType(CreateDeliveryMethodDto) {}

export class SetMethodZonesDto {
  @IsArray()
  @IsString({ each: true })
  zoneIds: string[];
}

export class CreateDeliverySlotDto {
  @IsString()
  deliveryMethodId: string;

  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsInt()
  @Min(0)
  startMinute: number;

  @IsInt()
  @Min(0)
  endMinute: number;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateDeliverySlotDto extends PartialType(CreateDeliverySlotDto) {}
