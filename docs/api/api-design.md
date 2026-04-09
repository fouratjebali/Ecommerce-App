# API Design

## Principles

- RESTful versioned endpoints under `/api/v1`
- Module ownership follows business capabilities, not UI screens
- Storefront endpoints may aggregate data to reduce frontend round-trips
- Admin and vendor APIs are protected by role-aware guards where needed

## Sprint 1 live endpoints

- `GET /api/v1/health`
- `GET /api/v1/catalog/highlights`
- `GET /api/v1/artisans/featured`
- `GET /api/v1/platform/overview`
- `GET /api/v1/storefront/homepage`

## Sprint 2 live endpoints

- `POST /api/v1/auth/register/buyer`
- `POST /api/v1/auth/register/artisan`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/catalog`
- `GET /api/v1/catalog/facets`
- `GET /api/v1/catalog/:slug`
- `GET /api/v1/catalog/vendor/attributes`
- `GET /api/v1/catalog/vendor/products`
- `POST /api/v1/catalog/vendor/products`
- `PATCH /api/v1/catalog/vendor/products/:id`
- `GET /api/v1/vendors/me/profile`
- `PATCH /api/v1/vendors/me/profile`
- `GET /api/v1/vendors/me/dashboard`
- `GET /api/v1/artisans`
- `GET /api/v1/artisans/:slug`

## Planned endpoint families

- `/api/v1/carts`
- `/api/v1/orders`
- `/api/v1/payments`
- `/api/v1/search`
- `/api/v1/admin`

## Storefront homepage payload

The homepage endpoint is intentionally aggregate-oriented. It gives the Angular storefront a single response containing hero content, metrics, category highlights, featured products, artisan stories, and roadmap initiatives.

## Integration notes

- Stripe webhooks will land in a dedicated payment module and publish internal order events
- Visual search will call an embeddings service and query `pgvector` with cosine similarity
- Meilisearch remains the primary faceted retrieval engine, with PostgreSQL as the source of truth
- Prisma currently owns the source-of-truth catalog and identity schema used by the Angular and NestJS Sprint 2 flows
