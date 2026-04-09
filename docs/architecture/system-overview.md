# System Overview

GreenCraft Marketplace is being built as a development-first monorepo with a clear separation between experience, commerce logic, and supporting infrastructure.

## Sprint 1 architecture

- `apps/web`: Angular storefront and future vendor/admin surfaces
- `apps/api`: NestJS API for storefront payloads, catalog, artisans, and platform services
- `infra`: Docker Compose stack for PostgreSQL with `pgvector`, Redis, RabbitMQ, Meilisearch, and pgAdmin
- `docs`: Architecture, domain, and API design references

## Bounded contexts

- `Identity & Access`: buyers, artisans, admins, RBAC, JWT
- `Vendor Management`: artisan profiles, onboarding, payout history, shop health
- `Catalog & PIM`: products, variants, materials, media, eco-ratings, faceted attributes
- `Cart & Bundle`: carts, bundle blueprints, coupons, reservations, shipping groups
- `Order & Payment`: checkout, Stripe intents, webhook confirmation, payouts
- `Impact Intelligence`: carbon factors, sourcing evidence, impact score calculation
- `Search & Discovery`: Meilisearch filters, AI visual search, recommendations
- `Messaging & Loyalty`: abandoned cart recovery, shipment updates, points automation
- `Analytics & Experimentation`: KPI streams, funnels, feature flags, A/B tests

## Runtime flow

1. Angular requests storefront data from `/api/v1/storefront/homepage`
2. NestJS aggregates catalog, artisan, and platform modules into a single payload
3. PostgreSQL stores normalized business entities and vector embeddings for visual search
4. Redis, RabbitMQ, and Meilisearch support later sprints without changing the core repo layout

## Key design decisions

- Versioned HTTP APIs from the start to protect future vendor and admin clients
- Module-driven NestJS structure aligned to domain boundaries instead of controller sprawl
- Local-first Docker stack so new contributors can boot the platform with predictable service contracts
- `pgvector` selected early because visual search is a product differentiator, not an afterthought
