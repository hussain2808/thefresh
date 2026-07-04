import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { BrandsService } from './brands.service';
import { AttributesService } from './attributes.service';
import { FamiliesService } from './families.service';
import { CreateCategoryDto, SetCategoryAttributesDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { CreateAttributeDto, UpdateAttributeDto } from './dto/attribute.dto';
import {
  CreateFamilyDto,
  CreateImageDto,
  CreatePrepOptionDto,
  CreateVariantDto,
  CreateWeightOptionDto,
  SetAttributeValuesDto,
  UpdateFamilyDto,
  UpdateVariantDto,
  WeightRuleDto,
} from './dto/family.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/catalog/categories')
export class CategoriesAdminController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll() {
    return this.categories.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findOne(id);
  }

  @Get(':id/effective-attributes')
  effectiveAttributes(@Param('id') id: string) {
    return this.categories.effectiveAttributes(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }

  @Put(':id/attributes')
  setAttributes(@Param('id') id: string, @Body() dto: SetCategoryAttributesDto) {
    return this.categories.setAttributes(id, dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/catalog/brands')
export class BrandsAdminController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  findAll() {
    return this.brands.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brands.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.brands.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brands.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brands.remove(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/catalog/attributes')
export class AttributesAdminController {
  constructor(private readonly attributes: AttributesService) {}

  @Get()
  findAll() {
    return this.attributes.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attributes.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAttributeDto) {
    return this.attributes.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    return this.attributes.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attributes.remove(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/catalog/families')
export class FamiliesAdminController {
  constructor(private readonly families: FamiliesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('status') status?: string,
  ) {
    return this.families.findAll({ search, categoryId, brandId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.families.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFamilyDto) {
    return this.families.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFamilyDto) {
    return this.families.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.families.remove(id);
  }

  @Post(':id/variants')
  addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.families.addVariant(id, dto);
  }

  @Post(':id/images')
  addImage(@Param('id') id: string, @Body() dto: CreateImageDto) {
    return this.families.addImage(id, dto);
  }

  @Put(':id/attributes')
  setAttributeValues(@Param('id') id: string, @Body() dto: SetAttributeValuesDto) {
    return this.families.setAttributeValues(id, dto.values);
  }

  @Post(':id/prep-options')
  addPrepOption(@Param('id') id: string, @Body() dto: CreatePrepOptionDto) {
    return this.families.addPrepOption(id, dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/catalog')
export class CatalogItemsAdminController {
  constructor(private readonly families: FamiliesService) {}

  @Patch('variants/:id')
  updateVariant(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.families.updateVariant(id, dto);
  }

  @Delete('variants/:id')
  removeVariant(@Param('id') id: string) {
    return this.families.removeVariant(id);
  }

  @Put('variants/:id/weight-rule')
  setWeightRule(@Param('id') id: string, @Body() dto: WeightRuleDto) {
    return this.families.setWeightRule(id, dto);
  }

  @Post('variants/:id/weight-options')
  addWeightOption(@Param('id') id: string, @Body() dto: CreateWeightOptionDto) {
    return this.families.addWeightOption(id, dto);
  }

  @Delete('weight-options/:id')
  removeWeightOption(@Param('id') id: string) {
    return this.families.removeWeightOption(id);
  }

  @Delete('images/:id')
  removeImage(@Param('id') id: string) {
    return this.families.removeImage(id);
  }

  @Patch('images/:id/primary')
  setPrimaryImage(@Param('id') id: string) {
    return this.families.setPrimaryImage(id);
  }

  @Delete('prep-options/:id')
  removePrepOption(@Param('id') id: string) {
    return this.families.removePrepOption(id);
  }
}
