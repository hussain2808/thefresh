# TheFresh

Weight-driven grocery commerce platform (chicken, mutton, fish, seafood — produce in Phase 2).

Unlike standard quick-commerce, orders here go through: **requested weight → estimated price → processing → actual weight → final invoice → payment**. The customer is billed on final measured weight, not what they selected in the cart.

## Layout

Monorepo:

| Folder | Stack | Responsibility |
|---|---|---|
| `api/` | NestJS + TypeScript + PostgreSQL/Prisma + Redis/BullMQ | Backend API |
| `admin/` | Next.js + Refine + shadcn/ui | Admin portal (products, categories, orders) |
| `docs/` | — | Architecture docs, shared by both apps |

`docker-compose.yml` at the root starts the shared Postgres/Redis used by `api/`.

## Getting Started

```bash
docker compose up -d               # Postgres (5434) + Redis (6381)

cd api
npm install
cp .env.example .env               # fill in JWT_SECRET, payment keys as needed
npm run prisma:generate
npm run prisma:migrate
npm run start:dev                  # http://localhost:3000, Swagger at /docs

cd ../admin
npm install
npm run dev                        # http://localhost:3001
```

## Architecture

The **Weight Adjustment Engine** (`api/src/modules/weight-adjustment`) is the core business capability and is kept independent from catalog, cart, payments, and delivery — see `/docs/architecture.md` for the full module breakdown, the order state machine, and the event flow.

Two non-negotiable conventions in the API:
- **Money** is always integer fils (`api/src/common/types/money.ts`) — never floats.
- **Weight** is always integer grams (`api/src/common/types/weight.ts`) — never floats.

## Module Map (`api/`)

| Module | Responsibility |
|---|---|
| `catalog` | Products, categories, preparation options |
| `pricing` | Base pricing + weight modifier rules |
| `cart` | Weight-aggregating cart (Redis-backed) |
| `orders` | Order lifecycle + explicit state machine |
| `weight-adjustment` | Final weighing, variance, tolerance modes, price recalculation |
| `inventory` | Deducted only on final weight confirmation |
| `invoicing` | Final invoice generation |
| `payments` | Gateway-agnostic (COD, card, Apple/Google Pay, payment links) |
| `delivery` | Express + scheduled delivery slots |
| `notifications` | Push (FCM), WhatsApp (Phase 2) |
| `reporting` | Sales, revenue, weight variance, performance |

## Status

Auth, catalog (products/categories), and the pricing engine are implemented with test coverage. Admin portal covers products + categories. Everything else (cart, orders, weight-adjustment, payments, delivery, notifications, reporting) is still scaffold-only.
