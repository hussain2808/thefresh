import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, SetCategoryAttributesDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { parent: true, _count: { select: { families: true, children: true } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        attributes: { include: { attribute: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    await this.assertSlugFree(dto.slug);
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findOne(id);
    if (dto.parentId) await this.assertNoCycle(id, dto.parentId);
    if (dto.slug) await this.assertSlugFree(dto.slug, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { families: true, children: true } } },
    });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    if (category._count.families > 0 || category._count.children > 0) {
      throw new BadRequestException('Category has products or subcategories — move or archive them first');
    }
    return this.prisma.category.delete({ where: { id } });
  }

  async setAttributes(id: string, dto: SetCategoryAttributesDto) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.categoryAttribute.deleteMany({ where: { categoryId: id } }),
      this.prisma.categoryAttribute.createMany({
        data: dto.attributes.map((a, i) => ({
          categoryId: id,
          attributeId: a.attributeId,
          required: a.required ?? false,
          sortOrder: a.sortOrder ?? i,
        })),
      }),
    ]);
    return this.findOne(id);
  }

  /** Attribute definitions for a category including all its ancestors. */
  async effectiveAttributes(id: string) {
    const chain: string[] = [];
    let current: Category | null = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`Category ${id} not found`);
    while (current) {
      chain.push(current.id);
      current = current.parentId
        ? await this.prisma.category.findUnique({ where: { id: current.parentId } })
        : null;
    }
    return this.prisma.categoryAttribute.findMany({
      where: { categoryId: { in: chain } },
      include: { attribute: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private async assertSlugFree(slug: string, exceptId?: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Category slug "${slug}" already in use`);
    }
  }

  private async assertNoCycle(id: string, newParentId: string) {
    let cursor: string | null = newParentId;
    while (cursor) {
      if (cursor === id) throw new BadRequestException('Category cannot be its own ancestor');
      const parent: { parentId: string | null } | null = await this.prisma.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = parent?.parentId ?? null;
    }
  }
}
