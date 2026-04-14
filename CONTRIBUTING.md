# Contributing

## Development flow

1. Start from `dev`
2. Create or use the matching sprint branch
3. Make focused commits by capability
4. Verify the relevant build or tests
5. Merge back into `dev`

## Branches in use

- `main` for the eventual finished release line
- `dev` for ongoing integration
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
- `sprint-5/ai-foundation`
- `sprint-5/backend-craftmind`
- `sprint-5/frontend-craftmind`
- `sprint-5/docs`

## Commit style

- `feat:` for functionality
- `docs:` for documentation
- `chore:` for setup or maintenance
- `merge:` for explicit integration merges

## Verification

- Infrastructure: `npm run infra:up`
- Database schema: `npm run db:push`
- Database seed: `npm run db:seed`
- Frontend: `npm run build:web`
- Frontend tests: `npm run test:web -- --watch=false --browsers=ChromeHeadless`
- Backend: `npm run build:api`
- Backend tests: `npm run test:api`
- Backend e2e: `cd apps/api && npm run test:e2e`

Angular Karma tests may need local browser configuration depending on the machine running them.
