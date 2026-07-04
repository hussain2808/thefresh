import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
export class UpdateCountryDto extends PartialType(CreateCountryDto) {}

export class CreateCityDto {
  @IsString()
  name: string;

  @IsString()
  countryId: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
export class UpdateCityDto extends PartialType(CreateCityDto) {}

export class CreateZoneDto {
  @IsString()
  name: string;

  @IsString()
  cityId: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
export class UpdateZoneDto extends PartialType(CreateZoneDto) {}

export class CreateAreaDto {
  @IsString()
  name: string;

  @IsString()
  zoneId: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
export class UpdateAreaDto extends PartialType(CreateAreaDto) {}
