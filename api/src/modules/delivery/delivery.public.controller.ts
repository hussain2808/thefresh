import { Controller, Get, Query } from '@nestjs/common';
import { ZoneDeliveryService } from './zone-delivery.service';

@Controller('delivery')
export class DeliveryPublicController {
  constructor(private readonly zoneDelivery: ZoneDeliveryService) {}

  @Get('resolve-zone')
  resolveZone(@Query('areaId') areaId: string) {
    return this.zoneDelivery.resolveZoneForArea(areaId);
  }
}
