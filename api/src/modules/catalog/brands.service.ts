import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Brand } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { families: true } } },
    });
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    return brand;
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    await this.assertSlugFree(dto.slug);
    return this.prisma.brand.create({ data: dto });
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    await this.findOne(id);
    if (dto.slug) await this.assertSlugFree(dto.slug, id);
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<Brand> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { families: true } } },
    });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    if (brand._count.families > 0) {
      throw new BadRequestException('Brand is used by products — reassign them first');
    }
    return this.prisma.brand.delete({ where: { id } });
  }

  private async assertSlugFree(slug: string, exceptId?: string) {
    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Brand slug "${slug}" already in use`);
    }
  }
}
