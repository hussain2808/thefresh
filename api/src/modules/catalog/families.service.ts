import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus, SellingType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AttributeValueItemDto,
  CreateFamilyDto,
  CreateImageDto,
  CreatePrepOptionDto,
  CreateVariantDto,
  CreateWeightOptionDto,
  UpdateFamilyDto,
  UpdateVariantDto,
  WeightRuleDto,
} from './dto/family.dto';

const FAMILY_INCLUDE = {
  category: true,
  brand: true,
  variants: {
    orderBy: { sortOrder: 'asc' as const },
    include: { weightRule: true, weightOptions: true, listings: true },
  },
  images: { orderBy: { sortOrder: 'asc' as const } },
  attributes: { include: { attribute: true } },
  prepOptions: true,
};

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { search?: string; categoryId?: string; brandId?: string; status?: string } = {}) {
    const where: Prisma.ProductFamilyWhereInput = {};
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.status) where.status = filters.status as ProductStatus;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: filters.search, mode: 'insensitive' } } } },
        { variants: { some: { barcode: { contains: filters.search } } } },
      ];
    }
    return this.prisma.productFamily.findMany({
      where,
      include: FAMILY_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const family = await this.prisma.productFamily.findUnique({ where: { id }, include: FAMILY_INCLUDE });
    if (!family) throw new NotFoundException(`Product family ${id} not found`);
    return family;
  }

  async create(dto: CreateFamilyDto) {
    await this.assertSlugFree(dto.slug);
    const family = await this.prisma.productFamily.create({ data: dto });
    return this.findOne(family.id);
  }

  async update(id: string, dto: UpdateFamilyDto) {
    await this.findOne(id);
    if (dto.slug) await this.assertSlugFree(dto.slug, id);
    if (dto.status === 'ACTIVE') await this.assertActivatable(id);
    await this.prisma.productFamily.update({ where: { id }, data: dto });
    return this.findOne(id);
  }

  async remove(id: string) {
    const family = await this.findOne(id);
    return this.prisma.productFamily.delete({ where: { id: family.id } });
  }

  // ── Variants ───────────────────────────────────────

  async addVariant(familyId: string, dto: CreateVariantDto) {
    await this.findOne(familyId);
    this.assertWeightConfigConsistent(dto.sellingType, dto.weightRule, dto.weightOptions);
    if (dto.weightRule?.displayWeightGrams) {
      this.assertDisplayWeightMatchesPreset(dto.weightRule.displayWeightGrams, dto.weightOptions);
    }
    await this.assertSkuFree(dto.sku);

    const { weightRule, weightOptions, ...variant } = dto;
    return this.prisma.variant.create({
      data: {
        ...variant,
        familyId,
        weightRule: weightRule ? { create: weightRule } : undefined,
        weightOptions: weightOptions?.length ? { create: weightOptions } : undefined,
      },
      include: { weightRule: true, weightOptions: true },
    });
  }

  async updateVariant(variantId: string, dto: UpdateVariantDto) {
    const variant = await this.getVariant(variantId);
    if (dto.sellingType && dto.sellingType !== variant.sellingType) {
      // Immutable once ordered — no orders module yet, so allow while ordering doesn't exist,
      // but keep the check hook here for when order lines land.
      this.assertWeightConfigConsistent(dto.sellingType, dto.weightRule, dto.weightOptions);
    }
    if (dto.sku && dto.sku !== variant.sku) await this.assertSkuFree(dto.sku);

    const { weightRule, weightOptions: _ignored, ...data } = dto;
    return this.prisma.variant.update({
      where: { id: variantId },
      data: {
        ...data,
        weightRule: weightRule
          ? { upsert: { create: weightRule, update: weightRule } }
          : undefined,
      },
      include: { weightRule: true, weightOptions: true },
    });
  }

  async removeVariant(variantId: string) {
    await this.getVariant(variantId);
    return this.prisma.variant.delete({ where: { id: variantId } });
  }

  async setWeightRule(variantId: string, dto: WeightRuleDto) {
    const variant = await this.getVariant(variantId);
    if (variant.sellingType !== SellingType.WEIGHT) {
      throw new BadRequestException('Weight rules only apply to WEIGHT variants');
    }
    if (dto.displayWeightGrams) {
      const options = await this.prisma.variantWeightOption.findMany({ where: { variantId } });
      this.assertDisplayWeightMatchesPreset(dto.displayWeightGrams, options);
    }
    return this.prisma.weightRule.upsert({
      where: { variantId },
      create: { variantId, ...dto },
      update: dto,
    });
  }

  async addWeightOption(variantId: string, dto: CreateWeightOptionDto) {
    const variant = await this.getVariant(variantId);
    if (variant.sellingType !== SellingType.WEIGHT) {
      throw new BadRequestException('Weight options only apply to WEIGHT variants');
    }
    return this.prisma.variantWeightOption.create({ data: { ...dto, variantId } });
  }

  async removeWeightOption(weightOptionId: string) {
    const option = await this.prisma.variantWeightOption.findUnique({ where: { id: weightOptionId } });
    if (!option) throw new NotFoundException(`Weight option ${weightOptionId} not found`);
    return this.prisma.variantWeightOption.delete({ where: { id: weightOptionId } });
  }

  // ── Images ─────────────────────────────────────────

  async addImage(familyId: string, dto: CreateImageDto) {
    await this.findOne(familyId);
    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({ where: { familyId }, data: { isPrimary: false } });
    }
    return this.prisma.productImage.create({ data: { ...dto, familyId } });
  }

  async removeImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);
    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  async setPrimaryImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException(`Image ${imageId} not found`);
    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({ where: { familyId: image.familyId }, data: { isPrimary: false } }),
      this.prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
    ]);
    return this.prisma.productImage.findUnique({ where: { id: imageId } });
  }

  // ── Attribute values ───────────────────────────────

  async setAttributeValues(familyId: string, values: AttributeValueItemDto[]) {
    await this.findOne(familyId);
    for (const item of values) {
      await this.assertAttributeValueValid(item);
    }
    await this.prisma.$transaction([
      this.prisma.productAttributeValue.deleteMany({ where: { familyId } }),
      this.prisma.productAttributeValue.createMany({
        data: values.map((v) => ({
          familyId,
          attributeId: v.attributeId,
          value: v.value as Prisma.InputJsonValue,
        })),
      }),
    ]);
    return this.findOne(familyId);
  }

  // ── Prep options ───────────────────────────────────

  async addPrepOption(familyId: string, dto: CreatePrepOptionDto) {
    await this.findOne(familyId);
    return this.prisma.preparationOption.create({ data: { ...dto, familyId } });
  }

  async removePrepOption(prepOptionId: string) {
    const option = await this.prisma.preparationOption.findUnique({ where: { id: prepOptionId } });
    if (!option) throw new NotFoundException(`Preparation option ${prepOptionId} not found`);
    return this.prisma.preparationOption.delete({ where: { id: prepOptionId } });
  }

  // ── Guards ─────────────────────────────────────────

  private async getVariant(variantId: string) {
    const variant = await this.prisma.variant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);
    return variant;
  }

  private async assertSlugFree(slug: string, exceptId?: string) {
    const existing = await this.prisma.productFamily.findUnique({ where: { slug } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Product slug "${slug}" already in use`);
    }
  }

  private async assertSkuFree(sku: string) {
    const existing = await this.prisma.variant.findUnique({ where: { sku } });
    if (existing) throw new ConflictException(`SKU "${sku}" already in use`);
  }

  private assertWeightConfigConsistent(
    sellingType: SellingType,
    weightRule?: WeightRuleDto,
    weightOptions?: CreateWeightOptionDto[],
  ) {
    if (sellingType === SellingType.WEIGHT) {
      if (!weightOptions?.length) throw new BadRequestException('WEIGHT variants require at least one weight option');
    } else if (weightRule || weightOptions?.length) {
      throw new BadRequestException(`${sellingType} variants must not have weight rules or options`);
    }
  }

  private assertDisplayWeightMatchesPreset(
    displayWeightGrams: number,
    options?: { weightGrams: number }[],
  ) {
    if (!options?.some((o) => o.weightGrams === displayWeightGrams)) {
      throw new BadRequestException(
        `displayWeightGrams (${displayWeightGrams}) must match one of the variant's weight option presets`,
      );
    }
  }

  private async assertActivatable(familyId: string) {
    const family = await this.prisma.productFamily.findUnique({
      where: { id: familyId },
      include: {
        variants: { where: { status: 'ACTIVE' }, include: { listings: true } },
        attributes: true,
        category: { include: { attributes: { where: { required: true } } } },
      },
    });
    if (!family) throw new NotFoundException(`Product family ${familyId} not found`);
    if (family.variants.length === 0) {
      throw new BadRequestException('Cannot activate: needs at least one active variant');
    }
    const missingRequired = family.category.attributes.filter(
      (req) => !family.attributes.some((v) => v.attributeId === req.attributeId),
    );
    if (missingRequired.length > 0) {
      throw new BadRequestException('Cannot activate: required category attributes are missing values');
    }
    const unpriced = family.variants.filter((v) => !v.listings.some((l) => l.priceFils > 0));
    if (unpriced.length > 0) {
      throw new BadRequestException(`Cannot activate: variant ${unpriced[0].sku} has no priced store listing`);
    }
  }

  private async assertAttributeValueValid(item: AttributeValueItemDto) {
    const def = await this.prisma.attributeDefinition.findUnique({ where: { id: item.attributeId } });
    if (!def) throw new NotFoundException(`Attribute ${item.attributeId} not found`);
    const v = item.value;
    const options = (def.options as string[] | null) ?? [];
    const fail = (msg: string) => {
      throw new BadRequestException(`Attribute "${def.code}": ${msg}`);
    };
    switch (def.type) {
      case 'TEXT':
        if (typeof v !== 'string') fail('expected text');
        break;
      case 'NUMBER':
        if (typeof v !== 'number') fail('expected a number');
        break;
      case 'BOOLEAN':
        if (typeof v !== 'boolean') fail('expected true/false');
        break;
      case 'SELECT':
        if (typeof v !== 'string' || !options.includes(v)) fail(`must be one of: ${options.join(', ')}`);
        break;
      case 'MULTI_SELECT':
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !options.includes(x))) {
          fail(`each value must be one of: ${options.join(', ')}`);
        }
        break;
    }
  }
}
