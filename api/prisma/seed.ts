import { PrismaClient, SellingType, ProductStatus, AttributeType, StockMovementType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const WEIGHT_DISCLAIMER =
  'Priced by weight — final charge is based on the actual weight at delivery.';

async function main() {
  // ── Admin user ─────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'test@thefresh.com' },
    update: {},
    create: {
      email: 'test@thefresh.com',
      passwordHash: await bcrypt.hash('password123', 10),
      name: 'Test Admin',
      role: 'ADMIN',
    },
  });

  // ── Store (single store today — see catalog-design.md §1.3) ──
  const store = await prisma.store.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: { name: 'Main Store', code: 'MAIN' },
  });

  // ── Categories ─────────────────────────────────────
  const fruitsVeg = await prisma.category.create({
    data: { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', sortOrder: 1 },
  });
  const fruits = await prisma.category.create({
    data: { name: 'Fruits', slug: 'fruits', parentId: fruitsVeg.id, sortOrder: 1 },
  });
  await prisma.category.create({
    data: { name: 'Vegetables', slug: 'vegetables', parentId: fruitsVeg.id, sortOrder: 2 },
  });
  const meat = await prisma.category.create({
    data: { name: 'Meat & Poultry', slug: 'meat-poultry', sortOrder: 2 },
  });
  const chicken = await prisma.category.create({
    data: { name: 'Chicken', slug: 'chicken', parentId: meat.id, sortOrder: 1 },
  });
  const mutton = await prisma.category.create({
    data: { name: 'Mutton', slug: 'mutton', parentId: meat.id, sortOrder: 2 },
  });
  const dairy = await prisma.category.create({
    data: { name: 'Dairy & Eggs', slug: 'dairy-eggs', sortOrder: 3 },
  });
  const milk = await prisma.category.create({
    data: { name: 'Milk', slug: 'milk', parentId: dairy.id, sortOrder: 1 },
  });
  const beverages = await prisma.category.create({
    data: { name: 'Beverages', slug: 'beverages', sortOrder: 4 },
  });
  const water = await prisma.category.create({
    data: { name: 'Water', slug: 'water', parentId: beverages.id, sortOrder: 1 },
  });

  // ── Brands ─────────────────────────────────────────
  const almarai = await prisma.brand.create({
    data: { name: 'Almarai', slug: 'almarai' },
  });
  const masafi = await prisma.brand.create({
    data: { name: 'Masafi', slug: 'masafi' },
  });

  // ── Attribute definitions + category attachments ───
  const origin = await prisma.attributeDefinition.create({
    data: {
      code: 'origin',
      label: 'Country of Origin',
      type: AttributeType.SELECT,
      options: ['Philippines', 'India', 'UAE', 'Saudi Arabia', 'Egypt'],
      filterable: true,
    },
  });
  const organic = await prisma.attributeDefinition.create({
    data: { code: 'organic', label: 'Organic', type: AttributeType.BOOLEAN, filterable: true },
  });
  const grade = await prisma.attributeDefinition.create({
    data: {
      code: 'grade',
      label: 'Grade',
      type: AttributeType.SELECT,
      options: ['Premium', 'Standard'],
      filterable: true,
    },
  });
  const fatPct = await prisma.attributeDefinition.create({
    data: { code: 'fat_percentage', label: 'Fat Percentage', type: AttributeType.NUMBER, unit: '%' },
  });

  await prisma.categoryAttribute.createMany({
    data: [
      { categoryId: fruitsVeg.id, attributeId: origin.id, required: true, sortOrder: 1 },
      { categoryId: fruitsVeg.id, attributeId: organic.id, sortOrder: 2 },
      { categoryId: fruitsVeg.id, attributeId: grade.id, sortOrder: 3 },
      { categoryId: dairy.id, attributeId: fatPct.id, sortOrder: 1 },
    ],
  });

  // Helper: create listing + initial stock in one go
  async function listingWithStock(variantId: string, priceFils: number, qty: number, threshold: number) {
    const listing = await prisma.storeListing.create({
      data: { storeId: store.id, variantId, priceFils, onHandQty: qty, lowStockThreshold: threshold },
    });
    await prisma.stockMovement.create({
      data: { listingId: listing.id, type: StockMovementType.RECEIVE, qtyDelta: qty, reason: 'Initial stock (seed)', actorId: 'seed' },
    });
    return listing;
  }

  // ── Banana — WEIGHT ────────────────────────────────
  const banana = await prisma.productFamily.create({
    data: {
      name: 'Banana',
      slug: 'banana',
      status: ProductStatus.ACTIVE,
      categoryId: fruits.id,
      disclaimer: WEIGHT_DISCLAIMER,
      attributes: {
        create: [
          { attributeId: origin.id, value: 'Philippines' },
          { attributeId: organic.id, value: false },
          { attributeId: grade.id, value: 'Premium' },
        ],
      },
      variants: {
        create: {
          sku: 'BANANA-KG',
          name: 'By weight',
          sellingType: SellingType.WEIGHT,
          weightOptions: {
            create: [
              { weightGrams: 500, label: '500g' },
              { weightGrams: 1000, label: '1kg' },
              { weightGrams: 2000, label: '2kg', modifierPercent: -5 },
            ],
          },
        },
      },
    },
    include: { variants: true },
  });
  await listingWithStock(banana.variants[0].id, 595, 50_000, 5_000); // AED 5.95/kg, 50kg on hand

  // ── Whole Chicken — WEIGHT + prep options ──────────
  const wholeChicken = await prisma.productFamily.create({
    data: {
      name: 'Whole Chicken',
      slug: 'whole-chicken',
      status: ProductStatus.ACTIVE,
      categoryId: chicken.id,
      disclaimer: WEIGHT_DISCLAIMER,
      prepOptions: { create: [{ name: 'Curry cut', chargeFils: 200 }] },
      variants: {
        create: {
          sku: 'CHICKEN-WHOLE-KG',
          name: 'By weight',
          sellingType: SellingType.WEIGHT,
          weightOptions: {
            create: [
              { weightGrams: 500, label: '500g', modifierPercent: 5 },
              { weightGrams: 1000, label: '1kg' },
            ],
          },
        },
      },
    },
    include: { variants: true },
  });
  await listingWithStock(wholeChicken.variants[0].id, 1500, 30_000, 3_000);

  // ── Indian Mutton — WEIGHT + displayWeightGrams ────
  // Psychological pricing: canonical price is AED 90/kg, but the storefront
  // headlines the 500g price (AED 45) instead — matches one of the actual
  // purchase presets, so it's a real price a customer can pay, not a
  // fabricated number.
  const muttonFamily = await prisma.productFamily.create({
    data: {
      name: 'Indian Mutton',
      slug: 'indian-mutton',
      status: ProductStatus.ACTIVE,
      categoryId: mutton.id,
      disclaimer: WEIGHT_DISCLAIMER,
      variants: {
        create: {
          sku: 'MUTTON-INDIAN-KG',
          name: 'By weight',
          sellingType: SellingType.WEIGHT,
          weightOptions: {
            create: [
              { weightGrams: 500, label: '500g' },
              { weightGrams: 1000, label: '1kg' },
            ],
          },
        },
      },
    },
    include: { variants: true },
  });
  await prisma.weightRule.create({
    data: { variantId: muttonFamily.variants[0].id, displayWeightGrams: 500 },
  });
  await listingWithStock(muttonFamily.variants[0].id, 9000, 15_000, 2_000); // AED 90/kg

  // ── Almarai Fresh Milk — UNIT variants ─────────────
  const almMilk = await prisma.productFamily.create({
    data: {
      name: 'Almarai Fresh Milk',
      slug: 'almarai-fresh-milk',
      status: ProductStatus.ACTIVE,
      categoryId: milk.id,
      brandId: almarai.id,
      attributes: { create: [{ attributeId: fatPct.id, value: 3 }] },
      variants: {
        create: [
          { sku: 'ALM-MILK-500', name: '500ml', sellingType: SellingType.UNIT, netContentValue: 500, netContentUnit: 'ml', sortOrder: 1 },
          { sku: 'ALM-MILK-1L', name: '1L', sellingType: SellingType.UNIT, netContentValue: 1000, netContentUnit: 'ml', sortOrder: 2 },
          { sku: 'ALM-MILK-2L', name: '2L', sellingType: SellingType.UNIT, netContentValue: 2000, netContentUnit: 'ml', sortOrder: 3 },
        ],
      },
    },
    include: { variants: { orderBy: { sortOrder: 'asc' } } },
  });
  await listingWithStock(almMilk.variants[0].id, 350, 120, 20);
  await listingWithStock(almMilk.variants[1].id, 650, 80, 15);
  await listingWithStock(almMilk.variants[2].id, 1150, 40, 10);

  // ── Masafi Water 24-pack — PACK ────────────────────
  const masafiWater = await prisma.productFamily.create({
    data: {
      name: 'Masafi Water',
      slug: 'masafi-water',
      status: ProductStatus.ACTIVE,
      categoryId: water.id,
      brandId: masafi.id,
      variants: {
        create: [
          { sku: 'MASAFI-500-24PK', name: '24 × 500ml', sellingType: SellingType.PACK, netContentValue: 12_000, netContentUnit: 'ml' },
        ],
      },
    },
    include: { variants: true },
  });
  await listingWithStock(masafiWater.variants[0].id, 2400, 60, 10);

  // ── Delivery: geography + methods (see docs/delivery-design.md) ────
  const uae = await prisma.country.create({ data: { name: 'United Arab Emirates', code: 'AE' } });
  const dubai = await prisma.city.create({ data: { name: 'Dubai', countryId: uae.id } });

  const dubaiSouth = await prisma.zone.create({ data: { name: 'Dubai South', cityId: dubai.id } });
  await prisma.area.createMany({
    data: [
      { name: 'Dubai South Residential', zoneId: dubaiSouth.id },
      { name: 'Emaar South', zoneId: dubaiSouth.id },
      { name: 'Expo Village', zoneId: dubaiSouth.id },
    ],
  });

  const newDubai = await prisma.zone.create({ data: { name: 'New Dubai', cityId: dubai.id } });
  await prisma.area.createMany({
    data: [
      { name: 'Marina', zoneId: newDubai.id },
      { name: 'JLT', zoneId: newDubai.id },
      { name: 'JBR', zoneId: newDubai.id },
    ],
  });

  const centralDubai = await prisma.zone.create({ data: { name: 'Central Dubai', cityId: dubai.id } });
  await prisma.area.createMany({
    data: [
      { name: 'Business Bay', zoneId: centralDubai.id },
      { name: 'Downtown', zoneId: centralDubai.id },
      { name: 'DIFC', zoneId: centralDubai.id },
    ],
  });

  // Delivery methods are the central object now — fee/min-order/free-above/
  // ETA live directly on the method (docs/delivery-design.md §1.2).
  const standard = await prisma.deliveryMethod.create({
    data: {
      name: 'Standard Delivery',
      code: 'STANDARD',
      description: 'Delivered within 2 hours.',
      feeFils: 500,
      minimumOrderAmountFils: 2000,
      freeDeliveryAboveFils: 10_000,
      estimatedDeliveryMinutes: 120,
    },
  });

  // Express is zone-restricted (New Dubai + Central Dubai only) — Dubai
  // South is too far for a 45-minute promise. No row in DeliveryMethodZone
  // for Dubai South means it's simply not offered there.
  const express = await prisma.deliveryMethod.create({
    data: {
      name: 'Express Delivery',
      code: 'EXPRESS',
      description: 'Delivered within 45 minutes.',
      feeFils: 2500,
      minimumOrderAmountFils: 3000,
      estimatedDeliveryMinutes: 45,
      zones: {
        create: [{ zoneId: newDubai.id }, { zoneId: centralDubai.id }],
      },
    },
  });

  // Slot based delivery — available everywhere (no zone restriction rows).
  const slotBased = await prisma.deliveryMethod.create({
    data: {
      name: 'Slot Based Delivery',
      code: 'SLOT_BASED',
      description: 'Customer picks a delivery slot.',
      feeFils: 500,
      minimumOrderAmountFils: 2000,
    },
  });

  // Generic slots (zoneId null) — apply to every zone this method is
  // available in, i.e. all three zones here, without duplicating them.
  await prisma.deliverySlot.createMany({
    data: [
      { deliveryMethodId: slotBased.id, name: '10:00 - 12:00', startMinute: 600, endMinute: 720, capacity: 100 },
      { deliveryMethodId: slotBased.id, name: '14:00 - 16:00', startMinute: 840, endMinute: 960, capacity: 100 },
      { deliveryMethodId: slotBased.id, name: '18:00 - 20:00', startMinute: 1080, endMinute: 1200, capacity: 100 },
    ],
  });

  // Dubai South override — smaller capacity for the same time windows,
  // demonstrating a zone-specific slot override on top of the generic ones.
  await prisma.deliverySlot.createMany({
    data: [
      {
        deliveryMethodId: slotBased.id,
        zoneId: dubaiSouth.id,
        name: '10:00 - 12:00',
        startMinute: 600,
        endMinute: 720,
        capacity: 30,
      },
      {
        deliveryMethodId: slotBased.id,
        zoneId: dubaiSouth.id,
        name: '14:00 - 16:00',
        startMinute: 840,
        endMinute: 960,
        capacity: 30,
      },
    ],
  });

  // ── Promotions: one example coupon (see docs/promotions-design.md) ─
  // WELCOME20 — 20% off, capped at AED 15, first order only.
  await prisma.promotion.create({
    data: {
      name: 'Welcome Discount',
      description: '20% off your first order, up to AED 15.',
      type: 'COUPON',
      status: 'ACTIVE',
      conditions: {
        create: [{ conditionType: 'FIRST_ORDER', operator: '=', value: true }],
      },
      rewards: {
        create: [{ rewardType: 'PERCENTAGE_DISCOUNT', value: 20, maxDiscountFils: 1500 }],
      },
      coupon: {
        create: { code: 'WELCOME20', perUserLimit: 1 },
      },
    },
  });

  console.log(
    'Seed complete: 1 store, 10 categories, 2 brands, 4 attributes, 5 families, 7 variants + listings/stock; ' +
      '1 country, 1 city, 3 zones, 9 areas, 3 delivery methods (1 zone-restricted), 5 slots (2 zone overrides); ' +
      '1 coupon (WELCOME20).',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
