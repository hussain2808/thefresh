import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GeographyService } from './geography.service';
import { MethodsService } from './methods.service';
import { ZoneDeliveryService } from './zone-delivery.service';
import {
  CreateAreaDto,
  CreateCityDto,
  CreateCountryDto,
  CreateZoneDto,
  UpdateAreaDto,
  UpdateCityDto,
  UpdateCountryDto,
  UpdateZoneDto,
} from './dto/geography.dto';
import {
  CreateDeliveryMethodDto,
  CreateDeliverySlotDto,
  SetMethodZonesDto,
  UpdateDeliveryMethodDto,
  UpdateDeliverySlotDto,
} from './dto/method.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/delivery/countries')
export class CountriesAdminController {
  constructor(private readonly geography: GeographyService) {}

  @Get() findAll() {
    return this.geography.findAllCountries();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.geography.findCountry(id);
  }
  @Post() create(@Body() dto: CreateCountryDto) {
    return this.geography.createCountry(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.geography.updateCountry(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.geography.removeCountry(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/delivery/cities')
export class CitiesAdminController {
  constructor(private readonly geography: GeographyService) {}

  @Get() findAll(@Query('countryId') countryId?: string) {
    return this.geography.findAllCities(countryId);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.geography.findCity(id);
  }
  @Post() create(@Body() dto: CreateCityDto) {
    return this.geography.createCity(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.geography.updateCity(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.geography.removeCity(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/delivery/zones')
export class ZonesAdminController {
  constructor(private readonly geography: GeographyService) {}

  @Get() findAll(@Query('cityId') cityId?: string) {
    return this.geography.findAllZones(cityId);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.geography.findZone(id);
  }
  @Post() create(@Body() dto: CreateZoneDto) {
    return this.geography.createZone(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.geography.updateZone(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.geography.removeZone(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/delivery/areas')
export class AreasAdminController {
  constructor(private readonly geography: GeographyService) {}

  @Get() findAll(@Query('zoneId') zoneId?: string) {
    return this.geography.findAllAreas(zoneId);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.geography.findArea(id);
  }
  @Post() create(@Body() dto: CreateAreaDto) {
    return this.geography.createArea(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateAreaDto) {
    return this.geography.updateArea(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.geography.removeArea(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/delivery/methods')
export class DeliveryMethodsAdminController {
  constructor(private readonly methods: MethodsService) {}

  @Get() findAll() {
    return this.methods.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.methods.findOne(id);
  }
  @Post() create(@Body() dto: CreateDeliveryMethodDto) {
    return this.methods.create(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDeliveryMethodDto) {
    return this.methods.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.methods.remove(id);
  }
  @Put(':id/zones') setZones(@Param('id') id: string, @Body() dto: SetMethodZonesDto) {
    return this.methods.setZones(id, dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/delivery/slots')
export class DeliverySlotsAdminController {
  constructor(private readonly zoneDelivery: ZoneDeliveryService) {}

  @Get() findAll(@Query('deliveryMethodId') deliveryMethodId?: string, @Query('zoneId') zoneId?: string) {
    return this.zoneDelivery.findAllSlots({ deliveryMethodId, zoneId });
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.zoneDelivery.findSlot(id);
  }
  @Post() create(@Body() dto: CreateDeliverySlotDto) {
    return this.zoneDelivery.createSlot(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDeliverySlotDto) {
    return this.zoneDelivery.updateSlot(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.zoneDelivery.removeSlot(id);
  }
}
