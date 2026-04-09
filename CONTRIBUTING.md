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

## Commit style

- `feat:` for functionality
- `docs:` for documentation
- `chore:` for setup or maintenance
- `merge:` for explicit integration merges

## Verification

- Frontend: `npm run build:web`
- Backend: `npm run build:api`
- Backend tests: `npm run test:api`

Angular Karma tests may need local browser configuration depending on the machine running them.
