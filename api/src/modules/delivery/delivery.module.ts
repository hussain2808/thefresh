import { Module } from '@nestjs/common';
import { GeographyService } from './geography.service';
import { MethodsService } from './methods.service';
import { ZoneDeliveryService } from './zone-delivery.service';
import {
  AreasAdminController,
  CitiesAdminController,
  CountriesAdminController,
  DeliveryMethodsAdminController,
  DeliverySlotsAdminController,
  ZonesAdminController,
} from './delivery.admin.controllers';
import { DeliveryPublicController } from './delivery.public.controller';

@Module({
  controllers: [
    CountriesAdminController,
    CitiesAdminController,
    ZonesAdminController,
    AreasAdminController,
    DeliveryMethodsAdminController,
    DeliverySlotsAdminController,
    DeliveryPublicController,
  ],
  providers: [GeographyService, MethodsService, ZoneDeliveryService],
  exports: [GeographyService, MethodsService, ZoneDeliveryService],
})
export class DeliveryModule {}
