# TheFresh — Promotions Design (Coupons, Cashback, Wallet)

**Status:** Proposed — V1 scope confirmed (Coupons only). Cashback/Wallet
designed here for the target architecture but deferred to a later pass.
**Scope:** Promotion Engine core model (`Promotion`/`PromotionCondition`/
`PromotionReward`), Coupon extension + redemption, Cashback extension +
earnings (deferred), Wallet + ledger (deferred).
**Companions:** `docs/catalog-design.md` (money-as-fils convention carried
over unchanged). Orders module (not yet built) — `CouponRedemption`
initially attaches to a `Cart`/basket concept; `orderId` is added once
Orders exists (see §5).

---

## 0. Why Coupons and Cashback are separate engines

A coupon affects the *current* order (AED 10 off, 20% off Fruits, free
delivery). A cashback affects a *future* order (spend AED 100 today, get
AED 10 wallet credit, spend it next week). Different business rules,
different accounting, different reporting — so even though they look
similar to a customer, they're modeled as two extensions of one shared
`Promotion` core, not one merged table.

Modeled as a **Promotion Engine** with submodules so it stays extensible
without a redesign:

```
Promotion Engine
│
├── Coupons          (V1)
├── Cashback          (later)
└── Wallet            (later — also backs referral rewards, manual
                        compensation, loyalty rewards when those exist)
```

---

## 1. Core domain model

### 1.1 `Promotion` — the master campaign

```
Promotion {
  id
  name
  description
  type          PromotionType    // COUPON | CASHBACK
  status        PromotionStatus  // DRAFT | ACTIVE | PAUSED | EXPIRED
  startAt
  endAt
  priority
  isActive
  createdAt
  updatedAt
}
```

One row per campaign, regardless of type. The `code` customers type at
checkout lives on the `Coupon` extension (§1.4), not here — a Cashback
campaign has no customer-facing code.

### 1.2 `PromotionCondition` — generic, not hardcoded rules

```
PromotionCondition {
  id
  promotionId
  conditionType   // MIN_ORDER_VALUE | ZONE | AREA | CATEGORY | PRODUCT |
                  // BRAND | FIRST_ORDER | CUSTOMER_SEGMENT |
                  // PAYMENT_METHOD | DELIVERY_METHOD | ORDER_COUNT
  operator        // e.g. >=, =, IN
  value           // Json — shape depends on conditionType
}
```

A promotion has zero or more conditions; all must pass (AND) for the
promotion to be eligible. Example: `MIN_ORDER_VALUE >= 5000` (fils) +
`ZONE = dubai-south-zone-id`.

### 1.3 `PromotionReward` — generic reward, not hardcoded per coupon type

```
PromotionReward {
  id
  promotionId
  rewardType    // FIXED_DISCOUNT | PERCENTAGE_DISCOUNT | FREE_DELIVERY |
                // CASHBACK_FIXED | CASHBACK_PERCENTAGE
  value         // fils for FIXED_*, integer percent for PERCENTAGE_*
  maxDiscount   // fils, nullable — cap for PERCENTAGE_DISCOUNT
}
```

Keeping conditions and rewards generic from day one is what lets V1 admin
UI stay dead simple (§4) while the schema doesn't need a redesign when
Cashback, Loyalty Points, Referral Rewards, or Gift Cards get added later.

### 1.4 `Coupon` — extension for `type = COUPON`

```
Coupon {
  promotionId    // 1:1 with Promotion
  code           // customer-facing, unique, e.g. "WELCOME20"
  usageLimit     // global cap, nullable = unlimited
  perUserLimit   // e.g. 1 = one redemption per customer
  stackable      // false for V1 — see §2
}
```

### 1.5 `CashbackCampaign` — extension for `type = CASHBACK` (deferred)

```
CashbackCampaign {
  promotionId
  expiryDays               // e.g. 30
  creditAfterDelivery      // always true — never credit before Delivered
  walletUsageLimitPercent  // e.g. 50 — max % of a future order payable by wallet
}
```

### 1.6 Wallet + ledger (deferred)

```
Wallet {
  id, customerId, balance, totalEarned, totalSpent, totalExpired
}

WalletTransaction {
  id, walletId, type (CREDIT|DEBIT|EXPIRY|REFUND|ADJUSTMENT),
  amount, referenceType (ORDER|CASHBACK|ADMIN|REFUND), referenceId,
  expiresAt, createdAt
}
```

`balance` is a cached rollup for read speed — the ledger
(`WalletTransaction`) is the source of truth. Never recompute a customer's
balance by trusting the cached column alone in a reconciliation job; sum
the ledger.

```
CashbackEarning {
  id, promotionId, customerId, orderId, earnedAmount,
  status (PENDING|EARNED|EXPIRED|REDEEMED), earnedAt, expiresAt
}
```

Lifecycle: `PENDING` when order placed → `EARNED` when order status
becomes `DELIVERED` (never earlier — avoids abuse from cancellations) →
`REDEEMED` when spent on a future order, or `EXPIRED` if unused within
`expiryDays`.

---

## 2. Coupon stacking — one coupon per order

Only one coupon per order. Otherwise customers chain
`WELCOME20 + FRESH10 + FREESHIP` and margins disappear. `Coupon.stackable`
exists in the schema for forward-compatibility but defaults `false` and
isn't exposed in the V1 admin UI.

## 3. Redemption flow (V1 — no Orders module yet)

Coupon UX for V1: **manual code entry only** — the customer types a code
at checkout, not silent auto-apply. This avoids needing a "best-of-N
eligible promotions" resolution algorithm before there's a real need for
it.

Since the Orders module doesn't exist yet, `CouponRedemption` is built
against the **cart/basket** concept, not `Order`:

```
CouponRedemption {
  id
  promotionId
  couponCode
  customerId
  cartId          // basket-scoped for V1
  orderId         // nullable — populated once Orders module exists
  discountAmountFils
  redeemedAt
}
```

Validating a code at checkout:
1. Look up `Coupon` by code → must resolve to an `ACTIVE` `Promotion`
   within `startAt`/`endAt`.
2. Evaluate all `PromotionCondition` rows against the current basket
   (min order value, zone, category contents, first-order check, etc.) —
   all must pass.
3. Check usage limits: total `CouponRedemption` count against
   `usageLimit`; per-customer count against `perUserLimit`.
4. Compute discount from `PromotionReward` (respecting `maxDiscount` cap
   for percentage rewards).
5. Write `CouponRedemption` row scoped to the cart. When the Orders module
   ships, redemption finalization (as opposed to a "trial validate" at
   checkout) will set `orderId` and this becomes the permanent record —
   never recalculate the discount later; freeze it here, same principle
   as `OrderDeliverySnapshot`.

## 4. V1 scope — admin UI stays simple

```
Promotions
│
├── Coupons
├── Cashback Campaigns   (UI scaffolded, disabled/hidden until built)
└── Wallet Transactions  (same)
```

**Coupon types shipped in V1:**
- `FIXED_DISCOUNT` (AED X off)
- `PERCENTAGE_DISCOUNT` (X% off, optionally capped)
- `FREE_DELIVERY`
- First-order coupon (a normal coupon with a `FIRST_ORDER` condition, not
  a separate reward type)

**Conditions shipped in V1:**
- `MIN_ORDER_VALUE`
- `ZONE`, `AREA`
- `DELIVERY_METHOD`
- `FIRST_ORDER`

`CATEGORY`/`PRODUCT`/`BRAND` conditions and `CUSTOMER_SEGMENT`/
`ORDER_COUNT`/`PAYMENT_METHOD` conditions exist as enum values in the
schema (so nothing needs a migration to add them) but aren't exposed in
the V1 admin form.

## 5. Deferred to a later pass

- Cashback campaigns, `CashbackEarning` lifecycle, Wallet + ledger,
  wallet-usage-cap enforcement at checkout.
- Product/category-specific coupon rewards ("Buy 2 Get 1 Free", "Buy 1kg
  Mango Get 500g Banana Free") — these need line-item-level reward
  application, not just a basket-level discount, and are deferred with
  Cashback.
- `orderId` on `CouponRedemption` — populated once the Orders module
  exists; until then redemptions are scoped to `cartId` only.
- Loyalty points, referral rewards, gift cards, store credits — future
  Promotion Engine submodules, no schema impact today since conditions/
  rewards are already generic.
