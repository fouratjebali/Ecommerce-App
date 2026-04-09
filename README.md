# GreenCraft Marketplace

GreenCraft Marketplace is a sustainable handmade goods platform that connects eco-conscious artisans with buyers who care about provenance, low-impact materials, and transparent storytelling.

Sprint 1 delivers the development foundation only. This repo is not configured for production deployment yet.

## Stack

- Angular 20 storefront in `apps/web`
- NestJS 11 API in `apps/api`
- PostgreSQL with `pgvector`, Redis, RabbitMQ, Meilisearch, and pgAdmin via Docker Compose
- Documentation for architecture, domain design, API contracts, and sprint planning

## Quick start

1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Run `npm run infra:up`
4. Run `npm run dev:api`
5. Run `npm run dev:web`

## Useful scripts

- `npm run dev:web`
- `npm run dev:api`
- `npm run build:web`
- `npm run build:api`
- `npm run test:api`
- `npm run infra:up`
- `npm run infra:down`
- `npm run infra:logs`

## Branch strategy

- `main`: reserved for the finished application and kept functionally empty except for the bootstrap commit
- `dev`: active integration branch for all development work
- `sprint-1/workspace-bootstrap`
- `sprint-1/backend-foundation`
- `sprint-1/infrastructure`
- `sprint-1/domain-design`
- `sprint-1/frontend-foundation`
- `sprint-1/docs-roadmap`

## Sprint 1 outcomes

- Angular storefront shell with an editorial GreenCraft landing page inspired by handmade marketplace storytelling
- NestJS API foundation with versioned routes for health, catalog, artisans, platform overview, and storefront homepage
- Local infrastructure with Docker Compose and `pgvector`-ready PostgreSQL
- Domain model, architecture references, and initial API contract documentation

## Documentation index

- `docs/architecture/system-overview.md`
- `docs/domain/domain-model.md`
- `docs/api/api-design.md`
- `docs/api/openapi-sprint-1.yaml`
- `docs/roadmap/e-scrum-roadmap.md`
- `CONTRIBUTING.md`
