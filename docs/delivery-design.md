# TheFresh — Delivery Method Design

**Status:** Proposed (v2 — see §0 for what changed from v1)
**Scope:** Geography (Country/City/Zone/Area), delivery methods, delivery
slots, order delivery snapshot.
**Companions:** `docs/catalog-design.md` (money-as-fils, snapshot-at-placement
principles carried over unchanged). `docs/architecture.md` (Order model —
`OrderDeliverySnapshot` attaches to it once the Orders module is built).

---

## 0. Changes from v1 — a flatter model

v1 modeled delivery config as a separate `ZoneDeliveryConfig` row per
zone×method (fee, min-order, free-above, ETA), plus method-specific
`ExpressConfig`/`DeliverySlot` extensions. In practice this felt like three
disconnected systems (Delivery Methods, Zone Config, Slot Management) for
what's conceptually one thing. Reworked to:

1. **`DeliveryMethod` becomes the heavy object.** Fee, minimum order,
   free-delivery threshold, and ETA all live directly on the method —
   "Standard Delivery" (2hr ETA, free above AED 100), "Express Delivery"
   (45min ETA, AED 25 fee), "Slot Based Delivery" (its own slots) are each
   one self-contained row. **`ZoneDeliveryConfig` is removed entirely** —
   there's no per-zone fee override for now (see §1.3 for the explicit
   call on this).
2. **"Scheduled Delivery" is gone as a concept.** There's no special
   method name or behavior called "scheduled" — it's just **"Slot Based
   Delivery"**, a method like any other, whose only distinguishing feature
   is that it has `DeliverySlot`s attached instead of a flat ETA.
   `ExpressConfig` (prep + travel minutes) is also removed — ETA is now
   just one stated number on the method, not computed from two parts.
3. **Zone/Area scoping becomes an optional availability filter, not a
   config row.** `DeliveryMethodZone` is a simple join: a method can
   optionally be restricted to specific zone(s) (e.g. "Standard Delivery —
   Dubai South only"). **No rows in this join = available everywhere.**
   This is deliberately the *only* place zone-specificity still lives for
   methods in general.
4. **`DeliverySlot` now belongs to a `DeliveryMethod`, with an *optional*
   `zoneId`.** A slot with no zone is a generic template usable in any
   zone the parent method is available in. A slot with a zone is a
   zone-specific override (different capacity/hours for that one zone).
   This directly avoids having to duplicate the same three time windows
   across every zone.
5. **The customer journey is now a filter, not a lookup chain:** customer
   picks an Area → system resolves the Zone → the full `DeliveryMethod`
   list is filtered to methods with no zone restriction OR whose
   restriction includes this zone → fee/ETA/slots come straight off the
   method (with zone-specific slot overrides applied if present).

### 1.3 clarified — no per-zone fee override for now

Explicitly confirmed: fee is one global number per method, not
zone-varying, even though a real business might eventually want Express to
cost more in a farther zone. If that need materializes, it's a targeted
addition (e.g. a `DeliveryMethodZoneOverride` table with just a fee
column) — additive, not a redesign, following the same pattern as
`PriceSchedule` in catalog. Not built now because it isn't a real
requirement yet.

---

## 1. Business Domain Model

### 1.1 Geography — unchanged from v1

```
Country
   └── City
        └── Zone   (operational unit; still not linked to Store — see catalog-design.md)
             └── Area   (customer-facing — what the address picker shows)
```

Full `Country`/`City`/`Zone`/`Area` tables from day one, same reasoning as
the single-`Store` decision in catalog: cheap now, expensive to retrofit.

### 1.2 Delivery methods — the central object now

`DeliveryMethod`: `name`, `code`, `description`, `active`, plus directly:

- `feeFils` — flat delivery charge.
- `minimumOrderAmountFils` — order floor to use this method.
- `freeDeliveryAboveFils?` — order value above which the fee is waived.
- `estimatedDeliveryMinutes?` — single stated ETA (null for slot-based
  methods, which show slots instead of an ETA).

Not a hardcoded enum — same reasoning as `AttributeDefinition` in catalog:
new methods (Pickup, Next Day) are just new rows, no code change. `code`
is still a stable programmatic key; nothing in the domain model treats any
particular code as structurally special anymore except "has slots or
doesn't," which is just "does this method have `DeliverySlot` rows."

### 1.3 Zone/Area availability — optional filter, not config

`DeliveryMethodZone` (method × zone, no extra columns beyond the two FKs):
presence of a row means "this method is available in this zone." **A
method with zero rows in this join is available in every zone** — that's
the default, and it's why most methods need no zone setup at all. Only
methods that are deliberately geographically limited (a zone-specific
promo, a slow-to-reach zone that doesn't get Express) need any rows here.

### 1.4 Delivery slots — belong to the method, zone is optional

`DeliverySlot` belongs to a `DeliveryMethod` (only meaningful for
slot-based methods) with an **optional** `zoneId`:

- `zoneId = null` → generic slot template, applies to every zone this
  method is available in (per §1.3).
- `zoneId` set → override for that specific zone only (different capacity
  or hours there).

Time-of-day is still minutes-from-midnight (recurring daily template, not
a `DateTime`). Capacity tracking is still the denormalized
`capacity`/`bookedCount` counter, same pattern as inventory
`onHandQty`/`reservedQty` — incremented/decremented by the Orders module
once it exists, not by this module.

### 1.5 Order snapshot — unchanged in shape

`OrderDeliverySnapshot` still freezes method name, zone/area name,
delivery fee, ETA, and slot date/start/end at placement — same principle,
just sourced from `DeliveryMethod` (+ the resolved slot) instead of
`ZoneDeliveryConfig`. `deliveryAddress` still plain text until a real
`Address` model exists.

---

## 2. Customer Journey

```
1. Customer selects/enters address → resolves to an Area → Zone derived.

2. System loads all active DeliveryMethods, filtered to:
     no DeliveryMethodZone rows for this method (available everywhere)
     OR a DeliveryMethodZone row exists for this method + this zone.

   Example — New Dubai:
     Standard Delivery   — AED 0 above 100, 2hr ETA
     Express Delivery    — AED 25, 45 min ETA
     Slot Based Delivery — pick a slot

   Example — Dubai South (Express has a zone restriction excluding it):
     Standard Delivery   — AED 0 above 100, 2hr ETA
     Slot Based Delivery — pick a slot

3a. Flat-ETA method selected → show fee + ETA → continue checkout.
3b. Slot-based method selected → load that method's slots: zone-specific
    ones for this zone if any exist, else the generic (zoneId = null) ones
    → customer picks one.

4. On order placement: matching DeliverySlot.bookedCount += 1 (if slot-based);
   OrderDeliverySnapshot written with everything frozen.
```

---

## 3. Module Boundaries

```
┌────────────────────────── api (NestJS) ──────────────────────────┐
│  delivery/                                                        │
│    geography/    ← countries, cities, zones, areas                │
│    methods/      ← delivery methods (fee/min-order/ETA + zone      │
│                     restriction join + slots)                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. Entity-Relationship Model

```
Country 1───* City 1───* Zone 1───* Area
                          │
                          ├──* DeliveryMethodZone *───1 DeliveryMethod
                          └──* DeliverySlot (optional zoneId) ───1 DeliveryMethod

Order 1───1 OrderDeliverySnapshot   (frozen at placement)
```

---

## 5. Database Schema (Prisma)

```prisma
model Country {
  id     String  @id @default(cuid())
  name   String
  code   String  @unique
  active Boolean @default(true)
  cities City[]
}

model City {
  id        String  @id @default(cuid())
  countryId String
  country   Country @relation(fields: [countryId], references: [id])
  name      String
  active    Boolean @default(true)
  zones     Zone[]
}

model Zone {
  id     String  @id @default(cuid())
  cityId String
  city   City    @relation(fields: [cityId], references: [id])
  name   String
  active Boolean @default(true)

  areas           Area[]
  methodZones     DeliveryMethodZone[]
  slots           DeliverySlot[]
}

model Area {
  id     String  @id @default(cuid())
  zoneId String
  zone   Zone    @relation(fields: [zoneId], references: [id])
  name   String
  active Boolean @default(true)
}

// The central object — fee, minimum order, free-delivery threshold, and
// ETA all live here directly. See docs/delivery-design.md §1.2.
model DeliveryMethod {
  id                       String  @id @default(cuid())
  name                     String
  code                     String  @unique
  description              String?
  active                   Boolean @default(true)
  feeFils                  Int
  minimumOrderAmountFils   Int     @default(0)
  freeDeliveryAboveFils    Int?
  estimatedDeliveryMinutes Int?    // null for slot-based methods

  zones DeliveryMethodZone[]
  slots DeliverySlot[]
}

// Presence of a row = this method is restricted to this zone. A method
// with zero rows is available everywhere (the default). See §1.3.
model DeliveryMethodZone {
  id               String         @id @default(cuid())
  deliveryMethodId String
  deliveryMethod   DeliveryMethod @relation(fields: [deliveryMethodId], references: [id], onDelete: Cascade)
  zoneId           String
  zone             Zone           @relation(fields: [zoneId], references: [id], onDelete: Cascade)

  @@unique([deliveryMethodId, zoneId])
}

// Recurring daily slot template, belongs to a method. zoneId null = generic
// (applies to every zone the method is available in); set = override for
// that one zone. See §1.4.
model DeliverySlot {
  id               String         @id @default(cuid())
  deliveryMethodId String
  deliveryMethod   DeliveryMethod @relation(fields: [deliveryMethodId], references: [id], onDelete: Cascade)
  zoneId           String?
  zone             Zone?          @relation(fields: [zoneId], references: [id])
  name             String?
  startMinute      Int
  endMinute        Int
  capacity         Int
  bookedCount      Int            @default(0)
  active           Boolean        @default(true)
}

// Frozen at order placement — never re-derive from live config.
model OrderDeliverySnapshot {
  orderId         String    @id
  order           Order     @relation(fields: [orderId], references: [id])
  methodName      String
  zoneName        String
  areaName        String
  deliveryFeeFils Int
  etaMinutes      Int?
  slotDate        DateTime?
  slotStart       Int?
  slotEnd         Int?
  deliveryAddress String
  createdAt       DateTime  @default(now())
}
```

---

## 6. API Design

Admin routes under `JwtAuthGuard + RolesGuard(ADMIN)`. Money is fils.

```
GET/POST        /admin/delivery/countries
GET/PATCH/DEL   /admin/delivery/countries/:id
GET/POST        /admin/delivery/cities            ?countryId=
GET/PATCH/DEL   /admin/delivery/cities/:id
GET/POST        /admin/delivery/zones              ?cityId=
GET/PATCH/DEL   /admin/delivery/zones/:id
GET/POST        /admin/delivery/areas              ?zoneId=
GET/PATCH/DEL   /admin/delivery/areas/:id

GET/POST        /admin/delivery/methods
GET/PATCH/DEL   /admin/delivery/methods/:id
PUT             /admin/delivery/methods/:id/zones   (replace the full zone-restriction list)

GET/POST        /admin/delivery/slots              ?methodId= &zoneId=
GET/PATCH/DEL   /admin/delivery/slots/:id
```

### Storefront (public/customer)

```
GET /delivery/resolve-zone?areaId=   → zone + filtered available methods (with slots for slot-based ones)
```

---

## 7. Refine Resource Structure

```ts
{ name: "delivery",         meta: { label: "Delivery" } },
{ name: "countries",        list/create/edit, meta: { parent: "delivery" } },
{ name: "cities",           list/create/edit, meta: { parent: "delivery" } },
{ name: "zones",            list/create/edit, meta: { parent: "delivery" } },
{ name: "areas",            list/create/edit, meta: { parent: "delivery" } },
{ name: "delivery-methods", list/create/edit, meta: { parent: "delivery" } },
{ name: "delivery-slots",   list: "/delivery/slots", meta: { parent: "delivery", label: "Slot Management" } },
```

## 8. Admin Screens

- **Countries / Cities / Zones / Areas** — simple CRUD, unchanged from v1.
- **Delivery Methods** — the main screen now: name, code, description, fee,
  min order, free-above, ETA, active, and a zone multi-select ("available
  everywhere" when empty). One screen instead of three.
- **Slot Management** — pick a method (must be a method that has/will have
  slots), see its generic slots plus any zone-specific overrides; optionally
  pick a zone to add an override for just that zone.

---

## 9. Validation Rules

- Country code, city/zone/area names — reasonably unique within parent.
- `freeDeliveryAboveFils`, if set, must exceed `minimumOrderAmountFils`.
- `DeliverySlot.startMinute < endMinute`, both within `[0, 1440)`.
- `DeliverySlot.bookedCount` never exceeds `capacity` (enforced at booking
  time in the Orders module).
- `DeliveryMethodZone` unique per (method, zone) — can't restrict the same
  method to the same zone twice.

---

## 10. Roadmap

| Phase | Scope |
|---|---|
| **1 (now)** | Geography CRUD, delivery methods (with fee/min-order/ETA), zone restriction join, slot templates (method + optional zone). |
| **2** | Wire into Orders: zone resolution at checkout, slot booking (bookedCount ±1), `OrderDeliverySnapshot` writes. Per-zone fee override table if that turns out to be a real need (see §1.3). |
| **3** | Real `Address` model replacing free-text `deliveryAddress`. |
| **Later** | Free-delivery campaigns, rider/fleet assignment, pickup locations. |
