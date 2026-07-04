import { PartialType } from '@nestjs/swagger';
import { AttributeType } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAttributeDto {
  @IsString()
  code: string;

  @IsString()
  label: string;

  @IsEnum(AttributeType)
  type: AttributeType;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  filterable?: boolean;
}

export class UpdateAttributeDto extends PartialType(CreateAttributeDto) {}
