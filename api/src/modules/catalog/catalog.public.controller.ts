import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLIC_FAMILY_INCLUDE = {
  category: true,
  brand: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  attributes: { include: { attribute: true } },
  prepOptions: true,
  variants: {
    where: { status: 'ACTIVE' as const },
    orderBy: { sortOrder: 'asc' as const },
    include: {
      weightRule: true,
      weightOptions: true,
      listings: { where: { enabled: true } },
    },
  },
};

@Controller('catalog')
export class CatalogPublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  categories() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  @Get('products')
  products(@Query('categoryId') categoryId?: string, @Query('search') search?: string) {
    return this.prisma.productFamily.findMany({
      where: {
        status: 'ACTIVE',
        ...(categoryId ? { categoryId } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: PUBLIC_FAMILY_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  @Get('products/:slug')
  async product(@Param('slug') slug: string) {
    const family = await this.prisma.productFamily.findUnique({
      where: { slug },
      include: PUBLIC_FAMILY_INCLUDE,
    });
    if (!family || family.status !== 'ACTIVE') {
      throw new NotFoundException(`Product "${slug}" not found`);
    }
    return family;
  }
}
