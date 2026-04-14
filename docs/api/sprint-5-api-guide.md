# Sprint 5 API Guide

Sprint 5 introduces CraftMind: a vendor-side AI assistant for catalog-aware chat, streamed copy support, and listing draft generation grounded in GreenCraft marketplace data.

## CraftMind endpoints

- `POST /api/v1/craftmind/chat`
- `POST /api/v1/craftmind/chat/stream`
- `POST /api/v1/craftmind/listing-drafts`

All three endpoints are protected and currently scoped to authenticated artisan users.

## Chat request model

- `prompt`: required string
- `history`: optional array of prior `user` and `assistant` messages

Example JSON payload:

```json
{
  "prompt": "Help me rewrite this bowl description with warmer sourcing language.",
  "history": [
    {
      "role": "user",
      "content": "I want a better title for this serving bowl."
    },
    {
      "role": "assistant",
      "content": "Start with the lead material and the intended use."
    }
  ]
}
```

## Stream behavior

- `POST /api/v1/craftmind/chat/stream` returns `text/event-stream`
- `token` events carry incremental `chunk` payloads
- `done` events return:
  - retrieval context
  - provider name
  - model name
  - suggested follow-up prompts

The Angular vendor workspace consumes this stream to render CraftMind output progressively while preserving the final context bundle for inspection.

## Listing draft request model

- `prompt`: required string
- `categoryId`: optional catalog category reference
- `ecoRatingId`: optional eco-rating reference
- `materialIds`: optional material tag references

Example JSON payload:

```json
{
  "prompt": "Generate a listing for a wide serving bowl inspired by Atlantic clay tones.",
  "categoryId": "category-uuid",
  "ecoRatingId": "eco-rating-uuid",
  "materialIds": ["material-uuid-1", "material-uuid-2"]
}
```

## Retrieval model

CraftMind grounds each response in a context bundle assembled from:

- artisan studio profile data
- vendor-owned products
- public catalog products
- material reference records
- marketplace publishing guidance

The response includes a context summary plus ranked documents so the frontend can show what informed the answer or listing draft.

## Provider model

- Default provider: local deterministic fallback
- Optional provider: Anthropic Messages API when `CRAFTMIND_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` are configured
- Relevant environment values:
  - `CRAFTMIND_PROVIDER`
  - `CRAFTMIND_MODEL`
  - `CRAFTMIND_MAX_TOKENS`
  - `CRAFTMIND_RETRIEVAL_LIMIT`
  - `CRAFTMIND_STREAM_DELAY_MS`
  - `ANTHROPIC_API_KEY`
  - `ANTHROPIC_API_URL`

## Verification

- `npm run build:api`
- `npm run test:api -- --runInBand`
- `cd apps/api && npm run test:e2e`
- `npm run build:web`
- `npm run test:web -- --watch=false --browsers=ChromeHeadless --progress=false`
