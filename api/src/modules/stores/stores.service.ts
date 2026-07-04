import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BulkUpdateListingsDto,
  CreateListingDto,
  CreateStockMovementDto,
  UpdateListingDto,
} from './dto/listing.dto';

const LISTING_INCLUDE = {
  variant: { include: { family: { include: { category: true, brand: true } }, weightRule: true } },
  store: true,
};

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  findAllStores() {
    return this.prisma.store.findMany({ orderBy: { name: 'asc' } });
  }

  /** The single store while stores.count == 1 — admin UI hides the selector. */
  async defaultStore() {
    const store = await this.prisma.store.findFirst({ orderBy: { code: 'asc' } });
    if (!store) throw new NotFoundException('No store configured — seed the database');
    return store;
  }

  async findListings(filters: {
    storeId?: string;
    search?: string;
    categoryId?: string;
    enabled?: string;
    lowStock?: string;
  }) {
    const storeId = filters.storeId ?? (await this.defaultStore()).id;
    const where: Prisma.StoreListingWhereInput = { storeId };
    if (filters.enabled !== undefined && filters.enabled !== '') {
      where.enabled = filters.enabled === 'true';
    }
    if (filters.categoryId) {
      where.variant = { family: { categoryId: filters.categoryId } };
    }
    if (filters.search) {
      where.OR = [
        { variant: { sku: { contains: filters.search, mode: 'insensitive' } } },
        { variant: { family: { name: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }
    const listings = await this.prisma.storeListing.findMany({
      where,
      include: LISTING_INCLUDE,
      orderBy: { variant: { family: { name: 'asc' } } },
    });
    if (filters.lowStock === 'true') {
      return listings.filter((l) => l.onHandQty - l.reservedQty <= l.lowStockThreshold);
    }
    return listings;
  }

  async findListing(id: string) {
    const listing = await this.prisma.storeListing.findUnique({ where: { id }, include: LISTING_INCLUDE });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    return listing;
  }

  async createListing(dto: CreateListingDto, actorId: string, storeId?: string) {
    const resolvedStoreId = storeId ?? (await this.defaultStore()).id;
    const existing = await this.prisma.storeListing.findUnique({
      where: { storeId_variantId: { storeId: resolvedStoreId, variantId: dto.variantId } },
    });
    if (existing) throw new ConflictException('Variant is already listed in this store');

    const { initialStockQty, ...data } = dto;
    const listing = await this.prisma.storeListing.create({
      data: { ...data, storeId: resolvedStoreId },
    });
    if (initialStockQty && initialStockQty > 0) {
      await this.recordMovement(listing.id, {
        type: StockMovementType.RECEIVE,
        qtyDelta: initialStockQty,
        reason: 'Initial stock',
      }, actorId);
    }
    return this.findListing(listing.id);
  }

  async updateListing(id: string, dto: UpdateListingDto) {
    const listing = await this.findListing(id);
    if (dto.enabled === true) {
      const price = dto.priceFils ?? listing.priceFils;
      if (price <= 0) throw new BadRequestException('Cannot enable a listing with no price');
    }
    if (dto.compareAtPriceFils != null) {
      const price = dto.priceFils ?? listing.priceFils;
      if (dto.compareAtPriceFils <= price) {
        throw new BadRequestException('Compare-at price must be greater than the selling price');
      }
    }
    await this.prisma.storeListing.update({ where: { id }, data: dto });
    return this.findListing(id);
  }

  async bulkUpdate(dto: BulkUpdateListingsDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.storeListing.update({
          where: { id: item.id },
          data: { enabled: item.enabled, priceFils: item.priceFils },
        }),
      ),
    );
    return { updated: dto.items.length };
  }

  // ── Stock ledger ───────────────────────────────────

  async recordMovement(listingId: string, dto: CreateStockMovementDto, actorId: string) {
    const listing = await this.findListing(listingId);
    const newOnHand = listing.onHandQty + dto.qtyDelta;
    if (newOnHand < 0) {
      throw new BadRequestException(
        `Movement would make stock negative (on hand: ${listing.onHandQty}, delta: ${dto.qtyDelta})`,
      );
    }
    if (newOnHand < listing.reservedQty) {
      throw new BadRequestException(
        `Movement would drop stock below the reserved quantity (${listing.reservedQty})`,
      );
    }
    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: { listingId, type: dto.type, qtyDelta: dto.qtyDelta, reason: dto.reason, actorId },
      }),
      this.prisma.storeListing.update({ where: { id: listingId }, data: { onHandQty: newOnHand } }),
    ]);
    return movement;
  }

  movementHistory(listingId: string) {
    return this.prisma.stockMovement.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
