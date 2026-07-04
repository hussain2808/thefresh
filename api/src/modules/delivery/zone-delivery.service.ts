import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliverySlotDto, UpdateDeliverySlotDto } from './dto/method.dto';

@Injectable()
export class ZoneDeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Delivery slots ──────────────────────────────────

  findAllSlots(filters: { deliveryMethodId?: string; zoneId?: string } = {}) {
    return this.prisma.deliverySlot.findMany({
      where: { deliveryMethodId: filters.deliveryMethodId, zoneId: filters.zoneId },
      include: { zone: true },
      orderBy: [{ deliveryMethodId: 'asc' }, { startMinute: 'asc' }],
    });
  }

  async findSlot(id: string) {
    const slot = await this.prisma.deliverySlot.findUnique({ where: { id }, include: { zone: true } });
    if (!slot) throw new NotFoundException(`Delivery slot ${id} not found`);
    return slot;
  }

  createSlot(dto: CreateDeliverySlotDto) {
    this.assertSlotTimesValid(dto.startMinute, dto.endMinute);
    return this.prisma.deliverySlot.create({ data: dto, include: { zone: true } });
  }

  async updateSlot(id: string, dto: UpdateDeliverySlotDto) {
    const current = await this.findSlot(id);
    this.assertSlotTimesValid(dto.startMinute ?? current.startMinute, dto.endMinute ?? current.endMinute);
    return this.prisma.deliverySlot.update({ where: { id }, data: dto, include: { zone: true } });
  }

  async removeSlot(id: string) {
    await this.findSlot(id);
    return this.prisma.deliverySlot.delete({ where: { id } });
  }

  private assertSlotTimesValid(startMinute: number, endMinute: number) {
    if (startMinute < 0 || startMinute >= 1440 || endMinute < 0 || endMinute > 1440) {
      throw new BadRequestException('Slot times must be within a single day (0–1440 minutes)');
    }
    if (startMinute >= endMinute) {
      throw new BadRequestException('startMinute must be before endMinute');
    }
  }

  // ── Storefront: resolve zone + available methods for an area ───────

  async resolveZoneForArea(areaId: string) {
    const area = await this.prisma.area.findUnique({ where: { id: areaId }, include: { zone: true } });
    if (!area) throw new NotFoundException(`Area ${areaId} not found`);

    const methods = await this.prisma.deliveryMethod.findMany({
      where: {
        active: true,
        OR: [{ zones: { none: {} } }, { zones: { some: { zoneId: area.zoneId } } }],
      },
      include: {
        slots: {
          where: { active: true, OR: [{ zoneId: null }, { zoneId: area.zoneId }] },
        },
      },
    });

    // Zone-specific slots override generic ones for the same time window
    // (matched by start/end); otherwise the generic slot applies as-is.
    const withResolvedSlots = methods.map((method) => {
      const zoneSpecific = method.slots.filter((s) => s.zoneId === area.zoneId);
      const generic = method.slots.filter((s) => s.zoneId === null);
      const overriddenKeys = new Set(zoneSpecific.map((s) => `${s.startMinute}-${s.endMinute}`));
      const effectiveSlots = [
        ...zoneSpecific,
        ...generic.filter((s) => !overriddenKeys.has(`${s.startMinute}-${s.endMinute}`)),
      ]
        .sort((a, b) => a.startMinute - b.startMinute)
        .map((s) => ({ ...s, remaining: s.capacity - s.bookedCount }));

      return { ...method, slots: effectiveSlots };
    });

    return { area, zone: area.zone, methods: withResolvedSlots };
  }
}
