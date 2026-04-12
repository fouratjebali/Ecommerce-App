# GreenCraft Marketplace

GreenCraft Marketplace is a sustainable handmade goods platform that connects eco-conscious artisans with buyers who care about provenance, low-impact materials, and transparent storytelling.

Sprint 4 is now in place in development mode. The repo includes local auth, vendor tooling, product management, Redis-aware cart sessions, stock reservation, an order management foundation, and a visual search workflow powered by `pgvector`, hybrid filtering, and Redis-backed fallbacks, but it is still not configured for production deployment.

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

## Sprint 3 buyer flow

1. Start the stack from the quick start section
2. Sign in as the seeded buyer account
3. Visit `/catalog` or `/catalog/:slug`
4. Add products to `/cart`
5. Apply `WELCOME10` or `STUDIOBUNDLE`
6. Continue to `/checkout`
7. Place the order and review `/orders`

## Sprint 4 visual search flow

1. Start the stack from the quick start section
2. Open `/visual-search`
3. Upload a photo reference
4. Apply optional category, material, eco-rating, artisan, impact, or price filters
5. Review the pgvector matches or Redis cold-start fallback set
6. Open a matched product or add it directly to the cart

The visual index is prepared lazily on the first visual-search request, so the first query may take a little longer while product embeddings are generated and cached.

## Sprint 3 artisan flow

1. Sign in as the seeded artisan account
2. Open `/vendor`
3. Update the studio profile or publish products
4. Review vendor order items in the OMS panel
5. Move items through `CONFIRMED`, `FULFILLING`, `SHIPPED`, or `CANCELLED`

## Seeded demo accounts

- Artisan: `noura@greencraft.local / Artisan@1234`
- Buyer: `buyer@greencraft.local / Buyer@1234`
- Admin: `admin@greencraft.local / Admin@1234`

## Seeded Sprint 3 data

- Coupons: `WELCOME10`, `STUDIOBUNDLE`
- Seeded buyer order: `GC-20260412-0001`
- Seeded catalog still includes artisan products ready for bundle and checkout testing

## Useful scripts

- `npm run dev:web`
- `npm run dev:api`
- `npm run build:web`
- `npm run build:api`
- `npm run test:web -- --watch=false --browsers=ChromeHeadless`
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
- `sprint-3/order-domain`
- `sprint-3/cart-oms-backend`
- `sprint-3/frontend-buyer-flow`
- `sprint-3/docs`
- `sprint-4/vector-foundation`
- `sprint-4/backend-visual-search`
- `sprint-4/frontend-visual-search`
- `sprint-4/docs`

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

## Sprint 3 outcomes

- Redis-backed cart sessions with an in-memory fallback for local development and tests
- Cart API for add, update, remove, coupon apply/remove, and checkout snapshots
- Inventory reservations that hold stock during cart activity and convert to consumed reservations on checkout
- OMS foundation with buyer checkout, buyer order history, buyer cancellation, and artisan order-item status management
- Angular buyer routes for `/cart`, `/checkout`, and `/orders`
- Artisan OMS panel inside `/vendor` for order item progression
- Backend unit and e2e tests for cart and order workflows plus frontend service specs for Sprint 3 browser behavior

## Sprint 4 outcomes

- Visual search API under `/api/v1/visual-search` with multipart image upload and cached recommendations
- `pgvector` storage prepared through backend SQL helpers with a lazy catalog indexing pass
- Image feature extraction powered by `sharp`, plus synthetic fallback vectors when remote product images are unavailable
- Hybrid ranking that combines cosine similarity with GreenCraft impact and filter context
- Redis-backed similar-product caches and cold-start category fallbacks
- Angular `/visual-search` page for photo upload and filter-driven discovery
- Product detail recommendations sourced from the Redis visual cache
- Backend tests for the extractor, ranking, and API surface plus a frontend service spec for upload requests

## Documentation index

- `docs/architecture/system-overview.md`
- `docs/domain/domain-model.md`
- `docs/api/api-design.md`
- `docs/api/sprint-2-api-guide.md`
- `docs/api/sprint-3-api-guide.md`
- `docs/api/sprint-4-api-guide.md`
- `docs/api/openapi-sprint-1.yaml`
- `docs/roadmap/e-scrum-roadmap.md`
- `CONTRIBUTING.md`
