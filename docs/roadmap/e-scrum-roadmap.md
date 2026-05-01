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

## Sprint 4 Complete

- Visual search using embeddings and `pgvector`
- Hybrid search filtering across category, artisan, material, price, and impact
- Redis-backed recommendation fallback and similar-product cache
- Angular upload flow and product-detail recommendation surface

## Sprint 5 Complete

- CraftMind chat experience inside the vendor workspace
- AI listing generation for artisans with apply-to-form drafting
- RAG over catalog, artisan profile, material references, and marketplace guidance
- Streamed vendor replies plus provider fallback support for local development

## Sprint 6 Next

- Stripe checkout with 3DS2
- Webhook-driven order confirmation
- Multi-vendor payout foundation

## Sprint 7 (QA) : Tests E2E (Cypress), tests de charge (JMeter), corrections de bugs

## Sprint 8 (UX & Final) : Polissage UI, optimisation mobile
