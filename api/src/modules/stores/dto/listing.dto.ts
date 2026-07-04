import { StockMovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class UpdateListingDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceFils?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPriceFils?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  costPriceFils?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class BulkListingItemDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceFils?: number;
}

export class BulkUpdateListingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkListingItemDto)
  items: BulkListingItemDto[];
}

export class CreateListingDto {
  @IsString()
  variantId: string;

  @IsInt()
  @Min(0)
  priceFils: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  initialStockQty?: number;
}

// Only manual movement types are accepted over HTTP; RESERVE/RELEASE/DEDUCT
// are written by the inventory module reacting to order events.
export class CreateStockMovementDto {
  @IsEnum(StockMovementType)
  @IsIn([StockMovementType.RECEIVE, StockMovementType.ADJUST])
  type: StockMovementType;

  @IsInt()
  qtyDelta: number;

  @IsString()
  reason: string;
}
