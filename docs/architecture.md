# Grocery Commerce Platform — NestJS Backend Architecture

**Stack:** NestJS + TypeScript + PostgreSQL (Prisma) + Redis/BullMQ
**Design principle:** The Weight Adjustment Engine (WAE) is an independent domain module. Catalog, Cart, Orders, Payments, and Delivery never implement weight/price math themselves — they call the WAE.

---

## Folder Structure

```
src/
├── main.ts
├── app.module.ts
│
├── common/                          # Cross-cutting, no business logic
│   ├── decorators/                  # @Roles(), @CurrentUser(), etc.
│   ├── guards/                      # JwtAuthGuard, RolesGuard
│   ├── interceptors/                # AuditLogInterceptor, TransformInterceptor
│   ├── filters/                     # Global exception filter
│   ├── pipes/                       # Validation pipes
│   └── types/                       # Money, Weight value objects, shared enums
│
├── config/                          # Typed config (env validation via zod/joi)
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── payment.config.ts
│
├── prisma/
│   ├── prisma.module.ts             # Global PrismaService
│   └── prisma.service.ts
│
├── modules/
│   │
│   ├── auth/                        # JWT auth (access + refresh), RBAC (customer/admin/store/rider)
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── firebase/                # Verifies Firebase ID tokens (customer phone-OTP login)
│   │   └── strategies/
│   │
│   ├── users/                       # Customers, addresses, admin users
│   │
│   ├── catalog/                     # Products, categories, brands, prep options
│   │   ├── catalog.module.ts
│   │   ├── products/
│   │   │   ├── products.service.ts
│   │   │   ├── products.controller.ts        # Customer-facing (read)
│   │   │   └── products.admin.controller.ts  # Admin CRUD
│   │   ├── categories/
│   │   ├── preparation-options/     # Curry cut, boneless, fillet + charges
│   │   └── dto/
│   │
│   ├── pricing/                     # Dynamic Pricing Engine (SRS §5)
│   │   ├── pricing.module.ts
│   │   ├── pricing.service.ts       # computeEstimatedPrice(product, weight, prep)
│   │   ├── weight-modifiers/        # 500g +5%, 2kg -5% rules
│   │   └── rules/                   # Seasonal/promo/VIP — Phase 2 slots in here
│   │
│   ├── inventory/                   # Deducted ONLY on final weight confirmation
│   │   ├── inventory.module.ts
│   │   ├── inventory.service.ts     # reserve(), confirmDeduction(), release()
│   │   └── listeners/               # Listens to weight.confirmed event
│   │
│   ├── cart/                        # Weight-aggregating cart (500g × 2 = 1kg)
│   │   ├── cart.module.ts
│   │   ├── cart.service.ts          # Redis-backed sessions
│   │   └── cart.controller.ts
│   │
│   ├── orders/                      # Order lifecycle + state machine (SRS §12)
│   │   ├── orders.module.ts
│   │   ├── orders.service.ts
│   │   ├── orders.controller.ts             # Customer: place, approve, track
│   │   ├── orders.admin.controller.ts       # Store: accept, weigh, invoice
│   │   ├── state-machine/
│   │   │   ├── order.machine.ts             # Explicit transition table
│   │   │   └── order-status.enum.ts
│   │   └── events/                          # OrderPlaced, WeightRecorded, ...
│   │
│   ├── weight-adjustment/           # ⭐ THE core engine (SRS §10–11)
│   │   ├── weight-adjustment.module.ts
│   │   ├── weight-adjustment.service.ts
│   │   ├── tolerance/
│   │   │   ├── tolerance.service.ts         # STRICT | TOLERANT | APPROVAL_REQUIRED
│   │   │   └── tolerance-config.repository.ts
│   │   ├── dto/
│   │   │   ├── adjustment-request.dto.ts    # order lines + actual weights
│   │   │   └── adjustment-result.dto.ts     # variance, final price, action
│   │   └── waste/                           # Fish yield display logic (SRS §7)
│   │
│   ├── invoicing/                   # Final invoice generation
│   │   ├── invoicing.module.ts
│   │   ├── invoicing.service.ts
│   │   └── templates/               # PDF/receipt generation
│   │
│   ├── payments/                    # Gateway-agnostic (SRS §13)
│   │   ├── payments.module.ts
│   │   ├── payments.service.ts
│   │   ├── payment-links/           # Link creation + expiry jobs
│   │   ├── providers/
│   │   │   ├── payment-provider.interface.ts
│   │   │   ├── tap.provider.ts      # or stripe.provider.ts / checkout.provider.ts
│   │   │   └── cod.provider.ts
│   │   └── webhooks/
│   │       └── payments.webhook.controller.ts
│   │
│   ├── delivery/                    # Express + scheduled slots (SRS §14)
│   │   ├── delivery.module.ts
│   │   ├── slots/                   # Slot config + Redis availability
│   │   ├── assignments/             # Rider assignment
│   │   └── delivery.controller.ts   # Rider app endpoints
│   │
│   ├── notifications/               # FCM push, WhatsApp later (SRS §15)
│   │   ├── notifications.module.ts
│   │   ├── channels/
│   │   │   ├── push.channel.ts      # FCM
│   │   │   └── whatsapp.channel.ts  # Phase 2 — same interface
│   │   └── listeners/               # Subscribes to order events
│   │
│   └── reporting/                   # Sales, variance, performance (SRS §16)
│       └── reporting.module.ts
│
└── jobs/                            # BullMQ processors
    ├── queues.module.ts
    ├── processors/
    │   ├── approval-timeout.processor.ts    # Auto-cancel unapproved orders
    │   ├── payment-link-expiry.processor.ts
    │   └── notification.processor.ts
    └── queues.constants.ts
```

---

## How the Weight Adjustment Engine Stays Independent

The WAE has **one job** and a narrow contract:

```typescript
// weight-adjustment.service.ts — the entire public surface

interface AdjustmentRequest {
  lines: {
    lineId: string;
    requestedWeightGrams: number;
    actualWeightGrams: number;
    estimatedPriceFils: number;      // integers, never floats
    pricePerKgFils: number;
    preparationChargeFils: number;
  }[];
  toleranceConfig: {
    mode: 'STRICT' | 'TOLERANT' | 'APPROVAL_REQUIRED';
    tolerancePercent: number;        // e.g. 10 → ±10%
  };
}

interface AdjustmentResult {
  lines: {
    lineId: string;
    variancePercent: number;
    finalPriceFils: number;
    withinTolerance: boolean;
  }[];
  totalFinalPriceFils: number;
  requiredAction: 'AUTO_PROCEED' | 'CUSTOMER_APPROVAL' | 'REJECT_REWEIGH';
}
```

Key rules that keep it clean:

1. **It never touches the database for orders.** Orders module fetches the data, calls `adjust()`, and persists the result. The WAE only reads its own tolerance config.
2. **It emits no side effects.** No notifications, no payment calls. It returns `requiredAction` and the Orders state machine decides what happens next.
3. **Pure function core.** The variance/price math lives in pure functions — trivially unit-testable, and the numbers here are your money. Test exhaustively.
4. **Money and weight as integers.** Fils (AED × 100) and grams. No floating point, ever. Convert at the API edge only.

This isolation is exactly what makes Phase 2 painless: multi-store means the WAE gets called with a `storeId`-scoped tolerance config; marketplace means vendors get their own configs. The engine itself doesn't change.

---

## Order State Machine (Explicit Transition Table)

```typescript
// order.machine.ts
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED:             ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED:           ['PROCESSING', 'CANCELLED'],
  PROCESSING:         ['WEIGHING'],
  WEIGHING:           ['AWAITING_APPROVAL', 'AWAITING_PAYMENT'],  // WAE decides
  AWAITING_APPROVAL:  ['AWAITING_PAYMENT', 'CANCELLED'],          // approve/timeout
  AWAITING_PAYMENT:   ['PAID', 'CANCELLED'],                      // COD → PAID at delivery
  PAID:               ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY:   ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERED:          [],
  // terminal: REJECTED, CANCELLED, DELIVERY_FAILED
};
```

Every transition goes through one `transition(orderId, to, actor, reason)` method that validates against this table, writes an `order_status_history` row (your audit log requirement), and emits a domain event. Nothing else in the codebase sets `order.status` directly.

---

## Event Flow for the Core Journey

```
Customer places order
  → orders: PLACED, emits OrderPlaced
  → notifications: push "Order received"

Store accepts → ACCEPTED → PROCESSING

Store enters actual weight
  → orders calls weight-adjustment.adjust()
  → result: AUTO_PROCEED
      → invoicing generates final invoice
      → payments creates link (or captures) → AWAITING_PAYMENT
  → result: CUSTOMER_APPROVAL
      → AWAITING_APPROVAL
      → notifications: "Weight recorded: 1.12kg (AED 40.32) — approve?"
      → jobs: approval-timeout scheduled (BullMQ delayed job)

Payment webhook confirms
  → orders: PAID, emits PaymentConfirmed
  → inventory: confirmDeduction() (this is the ONLY deduction point)
  → delivery: assign rider → OUT_FOR_DELIVERY
```

---

## Prisma Schema Starting Points (Core Entities)

```prisma
model Product {
  id            String   @id @default(cuid())
  name          String
  nameAr        String
  unitType      UnitType             // WEIGHT | PACK | VOLUME | PIECE
  basePriceFils Int                  // price per kg/l/pack/piece
  weightOptions WeightOption[]       // 500g, 750g, 1kg...
  prepOptions   PreparationOption[]
  wastePercent  Int?                 // fish: 30 → show expected yield
  toleranceMode ToleranceMode @default(TOLERANT)
  tolerancePct  Int           @default(10)
  // + category, brand, sku, images, status, descriptions
}

model OrderLine {
  id                    String  @id @default(cuid())
  orderId               String
  productId             String
  requestedWeightGrams  Int
  actualWeightGrams     Int?    // null until weighed
  estimatedPriceFils    Int
  finalPriceFils        Int?    // null until adjusted
  variancePercent       Decimal? @db.Decimal(5, 2)
  adjustmentReason      String?
  prepOptionId          String?
}

model OrderStatusHistory {
  id        String      @id @default(cuid())
  orderId   String
  from      OrderStatus
  to        OrderStatus
  actorId   String       // who did it — audit requirement
  actorRole String
  reason    String?
  createdAt DateTime    @default(now())
}
```

---

## Suggested Build Order

1. **Week 1–2:** auth, catalog, pricing engine (with weight modifiers) — unit test the math first
2. **Week 3:** cart (Redis) + order placement + state machine skeleton
3. **Week 4:** ⭐ weight-adjustment module + tolerance modes — full test coverage before wiring
4. **Week 5:** invoicing + payments (one provider + COD) + webhooks
5. **Week 6:** delivery slots/assignment, notifications, admin order screens
6. **Week 7+:** reporting, hardening, load testing against the 10k orders/day target
