# Local Infrastructure

GreenCraft uses Docker Compose for local development so Sprint 1 can run against the same service contracts the later sprints will need.

## Services

- PostgreSQL with `pgvector` for catalog, orders, and future visual search embeddings
- Redis for cart sessions and reservation workflows
- RabbitMQ for notification and automation events
- Meilisearch for faceted catalogue search
- pgAdmin for local database inspection

## Commands

- `npm run infra:up`
- `npm run infra:down`
- `npm run infra:logs`

The default credentials and ports live in the repo root `.env.example`.
