import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class WeighOrderItemDto {
  @IsString()
  orderItemId: string;

  @IsInt()
  @Min(1)
  actualWeightGrams: number;
}

export class WeighOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeighOrderItemDto)
  items: WeighOrderItemDto[];
}

// Shared by every action that may carry an optional note: reject, cancel,
// delivery-failed.
export class OrderReasonDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
