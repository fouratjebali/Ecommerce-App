# E-Scrum Roadmap

## Sprint 1 Complete

- Monorepo setup with Angular, NestJS, Docker Compose, and architecture docs
- Storefront shell and backend module skeleton
- Domain model and API design foundation

## Sprint 2 Complete

- JWT authentication and RBAC
- Artisan onboarding and vendor accounts
- Product information management and faceted catalog attributes
- Angular auth, catalog, product detail, and vendor workspace flows
- Prisma schema, seed data, and guarded vendor APIs

## Sprint 3 Complete

- Redis-backed cart sessions with in-memory fallback for local work and tests
- Coupon engine with seeded offer codes and cart-level pricing summaries
- Stock reservation workflow tied to cart updates and checkout consumption
- Buyer checkout, buyer order history, and buyer cancellation flow
- Artisan OMS queue inside the vendor dashboard with order-item status updates

## Sprint 4 Next

- Visual search using embeddings and `pgvector`
- Hybrid search filtering
- Redis-backed recommendation fallback

## Sprint 5 Planned

- CraftMind chat experience
- AI listing generation for artisans
- RAG over catalog and artisan knowledge

## Sprint 6 Planned

- Stripe checkout with 3DS2
- Webhook-driven order confirmation
- Multi-vendor payout foundation

## Sprint 7 Planned

- RabbitMQ automation for abandoned carts and shipment updates
- Loyalty point events
- Vendor dashboard analytics expansion

## Sprint 8 Planned

- Admin KPI dashboards
- Conversion funnel instrumentation
- A/B testing flags and release hardening before main branch launch
