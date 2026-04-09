# GreenCraft Marketplace

GreenCraft Marketplace is a sustainable handmade goods platform that connects eco-conscious artisans with buyers who care about provenance, low-impact materials, and transparent storytelling.

Sprint 2 is now in place in development mode. The repo includes local auth, vendor tooling, product management, and a Prisma-backed catalog, but it is still not configured for production deployment.

## Stack

- Angular 20 storefront in `apps/web`
- NestJS 11 API in `apps/api`
- PostgreSQL with `pgvector`, Redis, RabbitMQ, Meilisearch, and pgAdmin via Docker Compose
- Documentation for architecture, domain design, API contracts, and sprint planning

## Quick start

1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Run `npm run infra:up`
4. Run `npm run db:push`
5. Run `npm run db:seed`
6. Run `npm run dev:api`
7. Run `npm run dev:web`

Docker Desktop or a compatible local Docker engine is required for the infrastructure services.

## Seeded demo accounts

- Artisan: `noura@greencraft.local / Artisan@1234`
- Buyer: `buyer@greencraft.local / Buyer@1234`
- Admin: `admin@greencraft.local / Admin@1234`

## Useful scripts

- `npm run dev:web`
- `npm run dev:api`
- `npm run build:web`
- `npm run build:api`
- `npm run test:api`
- `cd apps/api && npm run test:e2e`
- `npm run infra:up`
- `npm run infra:down`
- `npm run infra:logs`
- `npm run db:push`
- `npm run db:seed`
- `npm run db:studio`

## Branch strategy

- `main`: reserved for the finished application and kept functionally empty except for the bootstrap commit
- `dev`: active integration branch for all development work
- `sprint-1/workspace-bootstrap`
- `sprint-1/backend-foundation`
- `sprint-1/infrastructure`
- `sprint-1/domain-design`
- `sprint-1/frontend-foundation`
- `sprint-1/docs-roadmap`
- `sprint-2/foundation-auth`
- `sprint-2/vendors-catalog`
- `sprint-2/frontend-flow`
- `sprint-2/docs`

## Sprint 1 outcomes

- Angular storefront shell with an editorial GreenCraft landing page inspired by handmade marketplace storytelling
- NestJS API foundation with versioned routes for health, catalog, artisans, platform overview, and storefront homepage
- Local infrastructure with Docker Compose and `pgvector`-ready PostgreSQL
- Domain model, architecture references, and initial API contract documentation

## Sprint 2 outcomes

- JWT authentication with buyer registration, artisan onboarding, and RBAC-backed route protection
- Prisma schema and seed data for users, artisan profiles, products, categories, materials, eco ratings, and attributes
- Public catalog browsing with faceted filters, product detail pages, and artisan-aware metadata
- Artisan vendor dashboard with profile editing, inventory overview, and product create/update flows
- Angular storefront routes for `/auth`, `/catalog`, `/catalog/:slug`, and `/vendor`

## Documentation index

- `docs/architecture/system-overview.md`
- `docs/domain/domain-model.md`
- `docs/api/api-design.md`
- `docs/api/sprint-2-api-guide.md`
- `docs/api/openapi-sprint-1.yaml`
- `docs/roadmap/e-scrum-roadmap.md`
- `CONTRIBUTING.md`
