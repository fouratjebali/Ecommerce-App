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

## Sprint 3 live endpoints

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:productId`
- `DELETE /api/v1/cart/items/:productId`
- `POST /api/v1/cart/coupons/apply`
- `DELETE /api/v1/cart/coupons`
- `DELETE /api/v1/cart`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:orderNumber`
- `POST /api/v1/orders/checkout`
- `POST /api/v1/orders/:orderNumber/cancel`
- `GET /api/v1/orders/vendor/items`
- `PATCH /api/v1/orders/vendor/items/:itemId/status`

## Sprint 4 live endpoints

- `POST /api/v1/visual-search/query`
- `GET /api/v1/visual-search/recommendations/:slug`

## Planned endpoint families

- `/api/v1/payments`
- `/api/v1/search`
- `/api/v1/admin`

## Storefront homepage payload

The homepage endpoint is intentionally aggregate-oriented. It gives the Angular storefront a single response containing hero content, metrics, category highlights, featured products, artisan stories, and roadmap initiatives.

## Sprint 3 integration notes

- Cart requests are keyed by the `x-cart-session` header and prefer Redis for session persistence
- Stock reservations are written to PostgreSQL so cart holds can be consumed or released transactionally
- Checkout converts the cart snapshot into order and order-item records, decrements inventory, and emits commerce domain events
- Buyer and artisan order flows share the same order module, with RBAC and endpoint shape separating responsibilities

## Sprint 4 integration notes

- Visual search uses `multipart/form-data` uploads and computes image features with `sharp`
- Product vectors are stored in PostgreSQL `pgvector` through raw SQL helpers rather than Prisma-native column support
- Redis keeps visually similar product IDs and category fallback sets warm for the storefront
- The Angular storefront now consumes both direct visual-search results and product-detail recommendation caches

## Future integration notes

- Stripe webhooks will land in a dedicated payment module and publish internal order events
- Meilisearch remains the primary faceted retrieval engine, with PostgreSQL as the source of truth
- Prisma currently owns the source-of-truth catalog, identity, and order schema used by the Angular and NestJS Sprint 4 flows
