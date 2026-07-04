import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliveryMethodDto, SetMethodZonesDto, UpdateDeliveryMethodDto } from './dto/method.dto';

const METHOD_INCLUDE = {
  zones: { include: { zone: true } },
  _count: { select: { slots: true } },
};

@Injectable()
export class MethodsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.deliveryMethod.findMany({ orderBy: { name: 'asc' }, include: METHOD_INCLUDE });
  }

  async findOne(id: string) {
    const method = await this.prisma.deliveryMethod.findUnique({ where: { id }, include: METHOD_INCLUDE });
    if (!method) throw new NotFoundException(`Delivery method ${id} not found`);
    return method;
  }

  async create(dto: CreateDeliveryMethodDto) {
    this.assertFreeThresholdValid(dto.freeDeliveryAboveFils, dto.minimumOrderAmountFils);
    const existing = await this.prisma.deliveryMethod.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Delivery method code "${dto.code}" already in use`);
    const method = await this.prisma.deliveryMethod.create({ data: dto });
    return this.findOne(method.id);
  }

  async update(id: string, dto: UpdateDeliveryMethodDto) {
    const current = await this.findOne(id);
    if (dto.code && dto.code !== current.code) {
      const existing = await this.prisma.deliveryMethod.findUnique({ where: { code: dto.code } });
      if (existing) throw new ConflictException(`Delivery method code "${dto.code}" already in use`);
    }
    this.assertFreeThresholdValid(
      dto.freeDeliveryAboveFils ?? current.freeDeliveryAboveFils ?? undefined,
      dto.minimumOrderAmountFils ?? current.minimumOrderAmountFils,
    );
    await this.prisma.deliveryMethod.update({ where: { id }, data: dto });
    return this.findOne(id);
  }

  async remove(id: string) {
    const method = await this.prisma.deliveryMethod.findUnique({ where: { id }, include: { _count: { select: { slots: true } } } });
    if (!method) throw new NotFoundException(`Delivery method ${id} not found`);
    if (method._count.slots > 0) {
      throw new BadRequestException('Delivery method has slots — remove those first');
    }
    return this.prisma.deliveryMethod.delete({ where: { id } });
  }

  async setZones(id: string, dto: SetMethodZonesDto) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.deliveryMethodZone.deleteMany({ where: { deliveryMethodId: id } }),
      this.prisma.deliveryMethodZone.createMany({
        data: dto.zoneIds.map((zoneId) => ({ deliveryMethodId: id, zoneId })),
      }),
    ]);
    return this.findOne(id);
  }

  private assertFreeThresholdValid(freeAbove?: number, minOrder?: number) {
    if (freeAbove != null && minOrder != null && freeAbove <= minOrder) {
      throw new BadRequestException('freeDeliveryAboveFils must be greater than minimumOrderAmountFils');
    }
  }
}
