# TheFresh — Catalog Management Design

**Status:** Proposed (v2 — see §0 for what changed from v1)
**Scope:** Catalog domain — categories, brands, product families, variants, attributes, store listings, inventory, pricing.
**Companions:** `docs/architecture.md` (order state machine — unchanged by this document).

---

## 0. Changes from v1

Revised after a design review of the weight-commodity flow specifically:

1. **No Arabic fields anywhere.** `nameAr`, `descriptionAr`, `labelAr` are removed
   from every model (`Category`, `Brand`, `ProductFamily`, `Variant`,
   `AttributeDefinition`, `PreparationOption`). Not "made optional" —
   removed. Arabic isn't supported yet; if/when it is, it comes back as a
   proper i18n mechanism (translations table or locale-keyed values), not a
   parallel `xAr` column bolted onto every model.
2. **Tolerance mode is gone entirely.** No `ToleranceMode` enum, no
   `tolerancePct`, no `minPickGrams`/`maxPickGrams`, no per-product
   approval/reject workflow. Every WEIGHT-sold variant is billed on **actual
   weight, always** — no admin configuration, no customer approval step. The
   "your price may change" fact is communicated once, universally, via UI
   copy for the `WEIGHT` selling type (see §1.5) — not a per-product
   business rule. This was a deliberate scope cut to keep the admin simple
   at launch; a physical-sanity safety net (was: `minPickGrams`/
   `maxPickGrams`) may come back later if picking mistakes turn out to be a
   real problem in practice.
3. **`displayWeightGrams` added to `WeightRule`** — psychological-pricing
   lever. Canonical price stays per kg; the storefront can headline the
   price computed at a smaller preset instead (see §1.5).
4. **`specification` and `disclaimer` added to `ProductFamily`** — free-text,
   admin-authored. `disclaimer` renders in a visually distinct style
   (banner/callout) wherever the product is shown; used for exactly the
   "final price is based on actual weight" notice, but not hardcoded to
   that — works for any product that needs a prominent notice later.
5. **`wastePercent` stays exactly as designed** (single field on
   `WeightRule`), explicitly flagged: real-world wastage varies by
   *preparation option* (whole fish vs. cleaned vs. cleaned-and-sliced), which
   this single-field model doesn't capture. Deferred until the business has
   looked closely at real numbers — likely resolution is moving the field
   onto `PreparationOption` instead of `WeightRule`.
6. **Deferred, not designed yet:** an admin UX where picking weight presets
   from a fixed dropdown (500g/1kg/1.5kg) auto-computes each price from the
   canonical per-kg rate, rather than the admin typing a price/modifier per
   preset by hand. Flagged for later — has real complexity around how the
   per-preset modifier interacts with auto-calculation that needs its own
   design pass.

Everything else from v1 (Selling-Type-first model, Family→Variant→Listing
hierarchy, single store now, category-attached attributes, stock ledger) is
unchanged and re-stated below for completeness.

---

## 1. Business Domain Model

### 1.1 The core insight: Selling Type drives everything

A banana, a bottle of milk, and a 24-pack of water are fundamentally different
*commercial* objects, even though they're all "products". Picking, pricing,
checkout, substitution, and analytics all branch on **how the thing is sold**,
not what it is. So the domain model is organized around `SellingType` first:

| SellingType | Examples | Customer buys | Billed on |
|---|---|---|---|
| `WEIGHT` | Banana, tomato, chicken, fish, mutton | 500g / 1kg / 2kg preset | **Actual picked weight, always** |
| `UNIT` | Toothbrush, ice cream, 1L milk bottle | 1, 2, 3 pieces | Fixed unit price |
| `VOLUME` | Loose juice, dispensed olive oil | 250ml / 500ml / 1L | Fixed per-volume price |
| `PACK` | Water 24-pack, Pepsi 6-pack, 30-egg tray | 1, 2 packs | Fixed pack price |
| `BUNDLE` | Fruit box, breakfast combo, Ramadan basket | 1 bundle | Fixed bundle price (Phase 2) |

**The weight-commodity rule, stated plainly (this was the point of the
design review):** for `WEIGHT` products — Chicken, Mutton, Fish — the
*product itself* is one thing with **one SKU**. The weight presets a
customer picks (500g/1kg/2kg) are **purchase-quantity choices on that one
variant**, never separate products or separate SKUs. This was already the
v1 intent (single implicit "by weight" variant per weight-commodity family)
and is reconfirmed here because it's the crux of the whole model.

Contrast with packaged goods: Almarai Milk in 500ml/1L/2L **are** genuinely
different products — different SKUs, independently stocked and priced. That
case is a real "family has multiple variants" situation, modeled as such.

**Note on VOLUME vs UNIT:** a *packaged* 1L milk bottle is a `UNIT` sale —
the customer buys "1 bottle", stock is counted in bottles, no measurement
happens at pick time. `VOLUME` is reserved for goods actually
dispensed/measured (fresh juice counters, bulk oil). Expect >90% of
beverages/dairy to be `UNIT` variants whose *size* is an attribute
(`netContentValue: 1000, netContentUnit: "ml"`), not a selling model.

### 1.2 The hierarchy

```
Category (tree)
   │
Product Family ──── Brand (lateral reference, optional)
   │
Variant  ←— SellingType lives here
   │
Store Listing (variant × store: enabled, price, stock)
```

Brand is a *lateral dimension*, not a hierarchy level: bananas and tomatoes
have no brand, and one brand (Almarai) spans many categories (milk, cheese,
juice). `ProductFamily` *belongs to* a Category and *optionally references*
a Brand.

**Concept definitions:**

- **Product Family** — the merchandising object. "Banana", "Whole Chicken",
  "Almarai Fresh Milk". Carries name, slug, description, `specification`,
  `disclaimer`, category, brand, images, attributes, status. **Never
  directly sellable.**
- **Variant** — the sellable object, carrying SKU, barcode, `sellingType`,
  net-content, and (for WEIGHT) the weight rule + purchase presets. Weight
  commodities get **exactly one** variant per family, no matter how many
  weight presets it offers — the presets live one level down
  (`VariantWeightOption`), not as separate variants.
- **Store Listing** — variant × store. Enabled flag, price, stock. Where
  day-to-day store operations lives.

### 1.3 Store strategy (1 today, 2–3 tomorrow)

`Store` + `StoreListing` exist now, seeded with one store, so adding store #2
later needs no schema change — just unhiding the store selector in the admin.
Everything else stays deliberately simple: no marketplace, no assortment
engine, one global catalog with per-store listings.

### 1.4 Category-specific attributes

Attributes are **definitions attached to categories**, not hardcoded columns:

- `AttributeDefinition` — code, label, type (`TEXT | NUMBER | BOOLEAN |
  SELECT | MULTI_SELECT`), unit, select-options, `filterable`.
- `CategoryAttribute` — attaches a definition to a category with `required`
  + `sortOrder`. A family presents the union of attributes attached to its
  category and that category's ancestors.
- `ProductAttributeValue` — family × attribute → typed JSON value.

Customer-facing filters are generated from `filterable` attributes of the
browsed category.

### 1.5 Weight rules — display price and yield only (no tolerance)

`WeightRule` is deliberately thin. It carries exactly two optional, purely
informational/presentational fields:

- **`displayWeightGrams`** — psychological pricing lever. Canonical price is
  always per kg on `StoreListing.priceFils`; if `displayWeightGrams` is set
  (e.g. `500`), the storefront headlines the price computed at that weight
  instead of the per-kg figure — e.g. premium mutton at AED 90/kg displays
  as "AED 45" (its 500g price) as the eye-catching number. Must match one of
  the variant's actual `VariantWeightOption` presets, so the displayed price
  is exactly what a customer pays for that quantity — never a fabricated
  number.
- **`wastePercent`** — for products like fish sold on pre-cleaning weight:
  the expected post-cleaning yield shown to customers ("you'll receive
  ~700g after cleaning for 1kg ordered"). **Known limitation, deferred:**
  real wastage varies by preparation choice (whole vs. cleaned vs.
  cleaned-and-sliced); this single flat field doesn't capture that yet.

**What's explicitly *not* here:** no tolerance mode, no tolerance
percentage, no min/max pick clamps, no approval workflow. Every WEIGHT
variant bills on actual weight automatically — this is universal system
behavior, not per-product config. The customer-facing communication of that
fact is the `disclaimer` field on `ProductFamily` (free text, prominently
styled) — pre-filled with suggested copy when selling type is WEIGHT, but
fully admin-editable, not hardcoded logic.

Purchase presets (`VariantWeightOption`): 500g / 1kg / 2kg, each with an
optional price `modifierPercent` (+5% for small cuts, −5% for bulk) — a
fixed list the admin defines; no free-text/arbitrary weight entry by
customers.

### 1.6 Inventory

- Quantities live on the **StoreListing**: `onHandQty`, `reservedQty`,
  `lowStockThreshold`. Unit of count follows selling type: **grams** for
  WEIGHT, **units/packs** otherwise (integers, always — same discipline as
  money-in-fils).
- Every change goes through an append-only `StockMovement` ledger
  (`RECEIVE | ADJUST | RESERVE | RELEASE | DEDUCT`, signed delta, reason,
  actor, optional orderId).
- Stock is DEDUCTed only on confirmed actual weight (WEIGHT) or on payment
  confirmation (others). Order placement only RESERVEs.
- Low-stock alert = `onHand - reserved <= lowStockThreshold`.

### 1.7 Pricing

On the StoreListing, all integer fils:

- `priceFils` — selling price. **Per kg** for WEIGHT variants; per
  unit/pack/bundle otherwise.
- `compareAtPriceFils?` — strike-through price.
- `costPriceFils?` — for margin reporting; admin-only.

Scheduled/promo pricing is a future `PriceSchedule` table — additive, no
redesign needed.

---

## 2. Catalog Architecture (module boundaries)

```
┌────────────────────────── api (NestJS) ──────────────────────────┐
│  catalog/     ← families, variants, brands, categories,          │
│                 attributes, images                                │
│  stores/      ← stores + listings (price, enabled)                │
│  inventory/   ← stock movements, reservations, alerts             │
│  pricing/     ← computeEstimatedPrice(variant, listing,           │
│                 weightOption?, prepOption?) — pure math           │
└──────────────────────────────────────────────────────────────────┘
```

Catalog owns *what can be sold*; Stores owns *where and for how much*;
Inventory owns *how many*. Orders (future) snapshots price at placement so
catalog edits never mutate history.

---

## 3. Entity-Relationship Model

```
Store 1───* StoreListing *───1 Variant *───1 ProductFamily *───1 Category (self-tree)
                │                 │                │  \
                │                 │                │   *───1 Brand (optional)
                │                 │                │
                │                 │                ├──* ProductImage
                │                 │                ├──* ProductAttributeValue *──1 AttributeDefinition
                │                 │                └──* PreparationOption
                │                 │
                │                 ├──1 WeightRule (WEIGHT variants only — display weight + waste % only)
                │                 ├──* VariantWeightOption (purchase presets)
                │                 └──* BundleComponent (BUNDLE variants → component variants)
                │
                └──* StockMovement (append-only ledger)

Category *──* AttributeDefinition  (via CategoryAttribute: required, sortOrder)
```

---

## 4. Database Schema (Prisma)

```prisma
enum SellingType {
  UNIT
  WEIGHT
  VOLUME
  PACK
  BUNDLE
}

enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum AttributeType {
  TEXT
  NUMBER
  BOOLEAN
  SELECT
  MULTI_SELECT
}

enum StockMovementType {
  RECEIVE   // goods received
  ADJUST    // manual correction (damage, count fix)
  RESERVE   // order placed
  RELEASE   // order cancelled / rejected
  DEDUCT    // order confirmed (actual weight / payment)
}

model Store {
  id        String  @id @default(cuid())
  name      String
  code      String  @unique          // "MAIN"
  status    String  @default("ACTIVE")
  listings  StoreListing[]
}

model Category {
  id         String   @id @default(cuid())
  name       String
  slug       String   @unique
  imageUrl   String?
  sortOrder  Int      @default(0)
  parentId   String?
  parent     Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children   Category[] @relation("CategoryTree")
  families   ProductFamily[]
  attributes CategoryAttribute[]
}

model Brand {
  id       String  @id @default(cuid())
  name     String
  slug     String  @unique
  logoUrl  String?
  families ProductFamily[]
}

model ProductFamily {
  id            String        @id @default(cuid())
  name          String
  slug          String        @unique
  description   String?
  specification String?       // open text — general product info
  disclaimer    String?       // open text — rendered prominently on the storefront
  status        ProductStatus @default(DRAFT)
  categoryId    String
  category      Category      @relation(fields: [categoryId], references: [id])
  brandId       String?
  brand         Brand?        @relation(fields: [brandId], references: [id])
  variants      Variant[]
  images        ProductImage[]
  attributes    ProductAttributeValue[]
  prepOptions   PreparationOption[]     // curry cut, boneless… (charge in fils)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Variant {
  id              String      @id @default(cuid())
  familyId        String
  family          ProductFamily @relation(fields: [familyId], references: [id], onDelete: Cascade)
  sku             String      @unique
  barcode         String?     @unique
  name            String      // "1L", "24 × 500ml", "By weight"
  sellingType     SellingType
  netContentValue Int?        // 1000
  netContentUnit  String?     // "ml", "g" — display only
  status          ProductStatus @default(ACTIVE)
  sortOrder       Int         @default(0)

  weightRule      WeightRule?
  weightOptions   VariantWeightOption[]
  bundleComponents BundleComponent[] @relation("BundleParent")
  usedInBundles    BundleComponent[] @relation("BundleChild")
  listings        StoreListing[]
}

model WeightRule {
  variantId          String  @id
  variant            Variant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  displayWeightGrams Int?    // psychological pricing display basis — must match a preset
  wastePercent       Int?    // fish: 30 → show expected post-cleaning yield
}

model VariantWeightOption {
  id              String  @id @default(cuid())
  variantId       String
  variant         Variant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  weightGrams     Int              // 500, 1000, 2000
  modifierPercent Int     @default(0)  // +5 / −5
  label           String?          // "500g"
}

model BundleComponent {
  id               String  @id @default(cuid())
  bundleVariantId  String
  bundleVariant    Variant @relation("BundleParent", fields: [bundleVariantId], references: [id], onDelete: Cascade)
  componentVariantId String
  componentVariant Variant @relation("BundleChild", fields: [componentVariantId], references: [id])
  quantity         Int     // units, or grams for WEIGHT components
}

model ProductImage {
  id        String  @id @default(cuid())
  familyId  String
  family    ProductFamily @relation(fields: [familyId], references: [id], onDelete: Cascade)
  variantId String?       // optional variant-specific image
  url       String
  sortOrder Int     @default(0)
  isPrimary Boolean @default(false)
}

model PreparationOption {
  id         String        @id @default(cuid())
  familyId   String
  family     ProductFamily @relation(fields: [familyId], references: [id], onDelete: Cascade)
  name       String
  chargeFils Int           @default(0)
}

model AttributeDefinition {
  id         String        @id @default(cuid())
  code       String        @unique  // "origin", "fat_percentage"
  label      String
  type       AttributeType
  unit       String?       // "%", "days", "°C"
  options    Json?         // SELECT/MULTI_SELECT choices
  filterable Boolean       @default(false)
  categories CategoryAttribute[]
  values     ProductAttributeValue[]
}

model CategoryAttribute {
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  attributeId String
  attribute   AttributeDefinition @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  required    Boolean @default(false)
  sortOrder   Int     @default(0)
  @@id([categoryId, attributeId])
}

model ProductAttributeValue {
  familyId    String
  family      ProductFamily @relation(fields: [familyId], references: [id], onDelete: Cascade)
  attributeId String
  attribute   AttributeDefinition @relation(fields: [attributeId], references: [id])
  value       Json   // typed by attribute.type
  @@id([familyId, attributeId])
}

model StoreListing {
  id                 String  @id @default(cuid())
  storeId            String
  store              Store   @relation(fields: [storeId], references: [id])
  variantId          String
  variant            Variant @relation(fields: [variantId], references: [id])
  enabled            Boolean @default(true)
  priceFils          Int             // per kg for WEIGHT; per unit/pack otherwise
  compareAtPriceFils Int?
  costPriceFils      Int?
  onHandQty          Int     @default(0)  // grams for WEIGHT; units otherwise
  reservedQty        Int     @default(0)
  lowStockThreshold  Int     @default(0)
  movements          StockMovement[]
  updatedAt          DateTime @updatedAt
  @@unique([storeId, variantId])
}

model StockMovement {
  id         String            @id @default(cuid())
  listingId  String
  listing    StoreListing      @relation(fields: [listingId], references: [id])
  type       StockMovementType
  qtyDelta   Int               // signed; grams or units per listing's variant
  reason     String?
  orderId    String?
  actorId    String
  createdAt  DateTime          @default(now())
}
```

---

## 5. API Design

All admin routes under `JwtAuthGuard + RolesGuard(ADMIN)` (STORE role gets
read + listing/stock write). Money is **fils**; weights are **grams**.

### Catalog (global)

```
GET/POST        /admin/catalog/categories
GET/PATCH/DEL   /admin/catalog/categories/:id
GET             /admin/catalog/categories/:id/effective-attributes
PUT             /admin/catalog/categories/:id/attributes

GET/POST        /admin/catalog/brands
GET/PATCH/DEL   /admin/catalog/brands/:id

GET/POST        /admin/catalog/attributes
GET/PATCH/DEL   /admin/catalog/attributes/:id

GET/POST        /admin/catalog/families              ?search= &categoryId= &brandId= &status=
GET/PATCH/DEL   /admin/catalog/families/:id
PUT             /admin/catalog/families/:id/attributes
POST/DEL/PATCH  /admin/catalog/families/:id/images    (+ set-primary)
POST            /admin/catalog/families/:id/variants
POST            /admin/catalog/families/:id/prep-options
PATCH/DEL       /admin/catalog/variants/:id
PUT             /admin/catalog/variants/:id/weight-rule
POST/DEL        /admin/catalog/variants/:id/weight-options
DEL             /admin/catalog/prep-options/:id
```

### Store operations

```
GET             /admin/stores
GET             /admin/listings      ?storeId= &search= &categoryId= &enabled= &lowStock=1
PATCH           /admin/listings/:id  (enabled, priceFils, compareAt, cost, threshold)
PATCH           /admin/listings/bulk (bulk price/enable updates)
POST            /admin/listings/:id/stock-movements  (RECEIVE/ADJUST with reason)
GET             /admin/listings/:id/stock-movements  (history)
```

### Storefront (public/customer)

```
GET /catalog/categories
GET /catalog/products              ?categoryId= &search=
GET /catalog/products/:slug
```

---

## 6. Refine Resource Structure

```ts
resources={[
  { name: "catalog",    meta: { label: "Catalog" } },
  { name: "categories", list/create/edit, meta: { parent: "catalog", icon: <Tags/> } },
  { name: "brands",     list/create/edit, meta: { parent: "catalog", icon: <BadgeCheck/> } },
  { name: "products",   list/create/edit, meta: { parent: "catalog", icon: <Boxes/> } },
  { name: "attributes", list/create/edit, meta: { parent: "catalog", icon: <ListChecks/> } },

  { name: "store-ops",  meta: { label: "Store Ops" } },
  { name: "listings",   list: "/store/listings",   meta: { parent: "store-ops", icon: <Store/> } },
  { name: "inventory",  list: "/store/inventory",  meta: { parent: "store-ops", icon: <PackageSearch/> } },
]}
```

---

## 7. Ant Design Screen Structure

### Products (Families) — the main screen
- **List:** name, category, brand, selling type tag(s), variant count,
  status. Search: name/SKU/barcode.
- **Detail (Edit) — tabbed:** Basic Information (name, slug, category,
  brand, description, **specification**, **disclaimer**, status) · Variants
  (SKU, selling type, weight rule = display weight + waste % only, weight
  presets) · Images · Attributes (generated from category) · Pricing &
  Stock (per-variant listing: price, compare-at, enabled, stock).
- **Create** — wizard (§8).

### Store → Assortment & Pricing
Dense table: product, variant, selling type, inline-editable price, enabled
switch, stock/low-stock indicator. Bulk enable/disable, bulk price update.

### Store → Inventory
Stock table + Adjust Stock modal (RECEIVE/ADJUST, signed qty, reason) +
Stock History drawer.

---

## 8. Product Creation Flow

```
1. Category & Type   → category, brand?, selling type
2. Basic Info        → name, slug (auto), description, specification,
                        disclaimer (pre-filled suggested copy when WEIGHT,
                        fully editable)
3. Variant           → SKU, barcode?, name, net content
                        WEIGHT → weight presets (grams, modifier %) +
                                 optional display weight + waste %
4. Pricing & Stock    → price, initial stock, low-stock threshold
5. Review & Publish   → DRAFT or ACTIVE
```

Publish requires: category set, ≥1 active variant, required category
attributes filled, a priced store listing.

---

## 9. Validation Rules

**Catalog**
- Category/brand/family slugs unique; category can't be its own ancestor;
  category with families/subcategories can't be deleted.
- SKU unique across all variants; barcode unique when present.
- `sellingType` immutable once a variant has ever been ordered.
- WEIGHT variant requires ≥1 weight option. `displayWeightGrams`, if set,
  must equal one of the variant's weight option `weightGrams` values.
  Non-WEIGHT variants must not have weight options or a weight rule.
- BUNDLE requires ≥1 component; components can't themselves be bundles.
- Required category attributes must have values before a family → ACTIVE.
- SELECT/MULTI_SELECT values must be one of the definition's options.

**Pricing & inventory**
- All money integer fils ≥ 0; `compareAtPriceFils > priceFils` when set.
- All quantities integer ≥ 0; `reservedQty ≤ onHandQty`.
- ADJUST/RECEIVE movements require a reason; all movements record an actor.
- A listing can't be enabled with `priceFils = 0`.

---

## 10. Roadmap

| Phase | Scope |
|---|---|
| **1 (now)** | Schema (family/variant/listing split, no tolerance, display weight, specification/disclaimer), categories/brands/attributes/products admin CRUD, creation wizard, assortment & pricing screen, stock ledger. |
| **2** | Per-prep-option wastage; auto-computed weight-preset pricing (dropdown → calculated price); physical-sanity clamp on actual weight if picking mistakes prove to be a real problem; bundles; promotions/scheduled pricing; product substitutions; barcode scanning; expiry tracking. |
| **3** | Store #2 (no schema change); purchase orders + supplier management. |
| **Later** | Arabic i18n (proper mechanism, not `xAr` columns); search infra when SQL search degrades; per-store pricing rules. |

**Explicit non-goals:** marketplace sellers, multi-vendor onboarding,
assortment optimization engines, 100s of stores, tolerance/approval
workflows (for now).
