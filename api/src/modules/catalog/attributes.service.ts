import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AttributeDefinition, AttributeType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttributeDto, UpdateAttributeDto } from './dto/attribute.dto';

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.attributeDefinition.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { categories: true, values: true } } },
    });
  }

  async findOne(id: string): Promise<AttributeDefinition> {
    const attribute = await this.prisma.attributeDefinition.findUnique({ where: { id } });
    if (!attribute) throw new NotFoundException(`Attribute ${id} not found`);
    return attribute;
  }

  async create(dto: CreateAttributeDto): Promise<AttributeDefinition> {
    this.assertOptionsValid(dto.type, dto.options);
    const existing = await this.prisma.attributeDefinition.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Attribute code "${dto.code}" already in use`);
    return this.prisma.attributeDefinition.create({
      data: { ...dto, options: dto.options ?? Prisma.JsonNull },
    });
  }

  async update(id: string, dto: UpdateAttributeDto): Promise<AttributeDefinition> {
    const current = await this.findOne(id);
    this.assertOptionsValid(dto.type ?? current.type, dto.options);
    if (dto.code && dto.code !== current.code) {
      const existing = await this.prisma.attributeDefinition.findUnique({ where: { code: dto.code } });
      if (existing) throw new ConflictException(`Attribute code "${dto.code}" already in use`);
    }
    return this.prisma.attributeDefinition.update({
      where: { id },
      data: { ...dto, options: dto.options === undefined ? undefined : dto.options ?? Prisma.JsonNull },
    });
  }

  async remove(id: string): Promise<AttributeDefinition> {
    const attribute = await this.prisma.attributeDefinition.findUnique({
      where: { id },
      include: { _count: { select: { values: true } } },
    });
    if (!attribute) throw new NotFoundException(`Attribute ${id} not found`);
    if (attribute._count.values > 0) {
      throw new BadRequestException('Attribute has product values — remove those first');
    }
    return this.prisma.attributeDefinition.delete({ where: { id } });
  }

  private assertOptionsValid(type: AttributeType, options?: string[]) {
    const needsOptions = type === 'SELECT' || type === 'MULTI_SELECT';
    if (needsOptions && (!options || options.length === 0)) {
      throw new BadRequestException(`${type} attributes require at least one option`);
    }
  }
}
