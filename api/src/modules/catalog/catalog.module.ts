import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { BrandsService } from './brands.service';
import { AttributesService } from './attributes.service';
import { FamiliesService } from './families.service';
import {
  AttributesAdminController,
  BrandsAdminController,
  CatalogItemsAdminController,
  CategoriesAdminController,
  FamiliesAdminController,
} from './catalog.admin.controllers';
import { CatalogPublicController } from './catalog.public.controller';

@Module({
  controllers: [
    CategoriesAdminController,
    BrandsAdminController,
    AttributesAdminController,
    FamiliesAdminController,
    CatalogItemsAdminController,
    CatalogPublicController,
  ],
  providers: [CategoriesService, BrandsService, AttributesService, FamiliesService],
  exports: [CategoriesService, BrandsService, AttributesService, FamiliesService],
})
export class CatalogModule {}
