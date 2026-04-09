# API Design

## Principles

- RESTful versioned endpoints under `/api/v1`
- Module ownership follows business capabilities, not UI screens
- Storefront endpoints may aggregate data to reduce frontend round-trips
- Admin and vendor APIs will be separated by role-aware guards in later sprints

## Sprint 1 live endpoints

- `GET /api/v1/health`
- `GET /api/v1/catalog/highlights`
- `GET /api/v1/artisans/featured`
- `GET /api/v1/platform/overview`
- `GET /api/v1/storefront/homepage`

## Planned endpoint families

- `/api/v1/auth`
- `/api/v1/vendors`
- `/api/v1/products`
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
