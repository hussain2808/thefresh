import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAreaDto, CreateCityDto, CreateCountryDto, CreateZoneDto, UpdateAreaDto, UpdateCityDto, UpdateCountryDto, UpdateZoneDto } from './dto/geography.dto';

@Injectable()
export class GeographyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Countries ──────────────────────────────────────

  findAllCountries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { cities: true } } } });
  }

  async findCountry(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id } });
    if (!country) throw new NotFoundException(`Country ${id} not found`);
    return country;
  }

  async createCountry(dto: CreateCountryDto) {
    const existing = await this.prisma.country.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Country code "${dto.code}" already in use`);
    return this.prisma.country.create({ data: dto });
  }

  async updateCountry(id: string, dto: UpdateCountryDto) {
    await this.findCountry(id);
    return this.prisma.country.update({ where: { id }, data: dto });
  }

  async removeCountry(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id }, include: { _count: { select: { cities: true } } } });
    if (!country) throw new NotFoundException(`Country ${id} not found`);
    if (country._count.cities > 0) throw new BadRequestException('Country has cities — remove them first');
    return this.prisma.country.delete({ where: { id } });
  }

  // ── Cities ─────────────────────────────────────────

  findAllCities(countryId?: string) {
    return this.prisma.city.findMany({
      where: countryId ? { countryId } : undefined,
      orderBy: { name: 'asc' },
      include: { country: true, _count: { select: { zones: true } } },
    });
  }

  async findCity(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id }, include: { country: true } });
    if (!city) throw new NotFoundException(`City ${id} not found`);
    return city;
  }

  createCity(dto: CreateCityDto) {
    return this.prisma.city.create({ data: dto });
  }

  async updateCity(id: string, dto: UpdateCityDto) {
    await this.findCity(id);
    return this.prisma.city.update({ where: { id }, data: dto });
  }

  async removeCity(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id }, include: { _count: { select: { zones: true } } } });
    if (!city) throw new NotFoundException(`City ${id} not found`);
    if (city._count.zones > 0) throw new BadRequestException('City has zones — remove them first');
    return this.prisma.city.delete({ where: { id } });
  }

  // ── Zones ──────────────────────────────────────────

  findAllZones(cityId?: string) {
    return this.prisma.zone.findMany({
      where: cityId ? { cityId } : undefined,
      orderBy: { name: 'asc' },
      include: { city: { include: { country: true } }, _count: { select: { areas: true, methodZones: true } } },
    });
  }

  async findZone(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        city: { include: { country: true } },
        areas: true,
        methodZones: { include: { deliveryMethod: true } },
      },
    });
    if (!zone) throw new NotFoundException(`Zone ${id} not found`);
    return zone;
  }

  createZone(dto: CreateZoneDto) {
    return this.prisma.zone.create({ data: dto });
  }

  async updateZone(id: string, dto: UpdateZoneDto) {
    await this.findZone(id);
    return this.prisma.zone.update({ where: { id }, data: dto });
  }

  async removeZone(id: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id }, include: { _count: { select: { areas: true } } } });
    if (!zone) throw new NotFoundException(`Zone ${id} not found`);
    if (zone._count.areas > 0) throw new BadRequestException('Zone has areas — remove them first');
    return this.prisma.zone.delete({ where: { id } });
  }

  // ── Areas ──────────────────────────────────────────

  findAllAreas(zoneId?: string) {
    return this.prisma.area.findMany({
      where: zoneId ? { zoneId } : undefined,
      orderBy: { name: 'asc' },
      include: { zone: true },
    });
  }

  async findArea(id: string) {
    const area = await this.prisma.area.findUnique({ where: { id }, include: { zone: true } });
    if (!area) throw new NotFoundException(`Area ${id} not found`);
    return area;
  }

  createArea(dto: CreateAreaDto) {
    return this.prisma.area.create({ data: dto });
  }

  async updateArea(id: string, dto: UpdateAreaDto) {
    await this.findArea(id);
    return this.prisma.area.update({ where: { id }, data: dto });
  }

  async removeArea(id: string) {
    await this.findArea(id);
    return this.prisma.area.delete({ where: { id } });
  }
}
