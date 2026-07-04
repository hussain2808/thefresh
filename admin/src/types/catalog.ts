// Mirrors api/prisma/schema.prisma — catalog v3 (docs/catalog-design.md).

export type SellingType = "UNIT" | "WEIGHT" | "VOLUME" | "PACK" | "BUNDLE";
export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type AttributeType = "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT" | "MULTI_SELECT";
export type StockMovementType = "RECEIVE" | "ADJUST" | "RESERVE" | "RELEASE" | "DEDUCT";

export interface Store {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  parentId: string | null;
  parent?: Category | null;
  _count?: { families: number; children: number };
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  _count?: { families: number };
}

export interface AttributeDefinition {
  id: string;
  code: string;
  label: string;
  type: AttributeType;
  unit: string | null;
  options: string[] | null;
  filterable: boolean;
  _count?: { categories: number; values: number };
}

export interface CategoryAttribute {
  categoryId: string;
  attributeId: string;
  required: boolean;
  sortOrder: number;
  attribute: AttributeDefinition;
}

export interface WeightRule {
  variantId: string;
  displayWeightGrams: number | null;
  wastePercent: number | null;
}

export interface VariantWeightOption {
  id: string;
  variantId: string;
  weightGrams: number;
  modifierPercent: number;
  label: string | null;
}

export interface StoreListing {
  id: string;
  storeId: string;
  variantId: string;
  enabled: boolean;
  priceFils: number;
  compareAtPriceFils: number | null;
  costPriceFils: number | null;
  onHandQty: number;
  reservedQty: number;
  lowStockThreshold: number;
  variant?: Variant & { family: ProductFamily };
  store?: Store;
}

export interface Variant {
  id: string;
  familyId: string;
  sku: string;
  barcode: string | null;
  name: string;
  sellingType: SellingType;
  netContentValue: number | null;
  netContentUnit: string | null;
  status: ProductStatus;
  sortOrder: number;
  weightRule?: WeightRule | null;
  weightOptions?: VariantWeightOption[];
  listings?: StoreListing[];
}

export interface ProductImage {
  id: string;
  familyId: string;
  variantId: string | null;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface PreparationOption {
  id: string;
  familyId: string;
  name: string;
  chargeFils: number;
}

export interface ProductAttributeValue {
  familyId: string;
  attributeId: string;
  value: unknown;
  attribute: AttributeDefinition;
}

export interface ProductFamily {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  specification: string | null;
  disclaimer: string | null;
  status: ProductStatus;
  categoryId: string;
  brandId: string | null;
  category?: Category;
  brand?: Brand | null;
  variants: Variant[];
  images: ProductImage[];
  attributes: ProductAttributeValue[];
  prepOptions: PreparationOption[];
}

export interface StockMovement {
  id: string;
  listingId: string;
  type: StockMovementType;
  qtyDelta: number;
  reason: string | null;
  orderId: string | null;
  actorId: string;
  createdAt: string;
}

export const SELLING_TYPE_COLORS: Record<SellingType, string> = {
  WEIGHT: "green",
  UNIT: "blue",
  VOLUME: "cyan",
  PACK: "purple",
  BUNDLE: "gold",
};

export const STATUS_COLORS: Record<ProductStatus, string> = {
  ACTIVE: "green",
  DRAFT: "default",
  ARCHIVED: "red",
};

export const WEIGHT_DISCLAIMER_DEFAULT =
  "Priced by weight — final charge is based on the actual weight at delivery.";
