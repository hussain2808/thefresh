import { PartialType } from '@nestjs/swagger';
import { ProductStatus, SellingType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  specification?: string;

  @IsOptional()
  @IsString()
  disclaimer?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  brandId?: string;
}

export class UpdateFamilyDto extends PartialType(CreateFamilyDto) {}

export class WeightRuleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  displayWeightGrams?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  wastePercent?: number;
}

export class CreateWeightOptionDto {
  @IsInt()
  @Min(1)
  weightGrams: number;

  @IsOptional()
  @IsInt()
  modifierPercent?: number;

  @IsOptional()
  @IsString()
  label?: string;
}

export class CreateVariantDto {
  @IsString()
  sku: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  name: string;

  @IsEnum(SellingType)
  sellingType: SellingType;

  @IsOptional()
  @IsInt()
  netContentValue?: number;

  @IsOptional()
  @IsString()
  netContentUnit?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeightRuleDto)
  weightRule?: WeightRuleDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWeightOptionDto)
  weightOptions?: CreateWeightOptionDto[];
}

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}

export class CreateImageDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class AttributeValueItemDto {
  @IsString()
  attributeId: string;

  // value is typed by the attribute definition (string | number | boolean | string[])
  value: unknown;
}

export class SetAttributeValuesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueItemDto)
  values: AttributeValueItemDto[];
}

export class CreatePrepOptionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  chargeFils?: number;
}
