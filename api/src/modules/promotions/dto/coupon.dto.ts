import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PromotionConditionType, PromotionRewardType } from '@prisma/client';

export class PromotionConditionItemDto {
  @IsEnum(PromotionConditionType)
  conditionType: PromotionConditionType;

  @IsString()
  operator: string;

  @IsDefined()
  value: unknown;
}

export class PromotionRewardItemDto {
  @IsEnum(PromotionRewardType)
  rewardType: PromotionRewardType;

  @IsInt()
  value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscountFils?: number;
}

export class CreateCouponDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionConditionItemDto)
  conditions: PromotionConditionItemDto[];

  @ValidateNested()
  @Type(() => PromotionRewardItemDto)
  reward: PromotionRewardItemDto;

  @IsString()
  code: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}
