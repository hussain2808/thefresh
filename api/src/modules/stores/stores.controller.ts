import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { StoresService } from './stores.service';
import {
  BulkUpdateListingsDto,
  CreateListingDto,
  CreateStockMovementDto,
  UpdateListingDto,
} from './dto/listing.dto';

// ADMIN manages everything; STORE staff manage listings/stock day-to-day.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STORE)
@Controller('admin')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get('stores')
  findAllStores() {
    return this.stores.findAllStores();
  }

  // Flat /admin/listings with optional ?storeId= (defaults to the single
  // store). The nested /admin/stores/:storeId/listings shape from the design
  // doc arrives with store #2 — this keeps the admin data provider trivial
  // while stores.count == 1.
  @Get('listings')
  findListings(
    @Query('storeId') storeId?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('enabled') enabled?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.stores.findListings({ storeId, search, categoryId, enabled, lowStock });
  }

  @Get('listings/:id')
  findListing(@Param('id') id: string) {
    return this.stores.findListing(id);
  }

  @Post('listings')
  createListing(
    @Body() dto: CreateListingDto,
    @CurrentUser() user: CurrentUserPayload,
    @Query('storeId') storeId?: string,
  ) {
    return this.stores.createListing(dto, user.id, storeId);
  }

  @Patch('listings/bulk')
  bulkUpdate(@Body() dto: BulkUpdateListingsDto) {
    return this.stores.bulkUpdate(dto);
  }

  @Patch('listings/:id')
  updateListing(@Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.stores.updateListing(id, dto);
  }

  @Post('listings/:id/stock-movements')
  recordMovement(
    @Param('id') id: string,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.stores.recordMovement(id, dto, user.id);
  }

  @Get('listings/:id/stock-movements')
  movementHistory(@Param('id') id: string) {
    return this.stores.movementHistory(id);
  }
}
