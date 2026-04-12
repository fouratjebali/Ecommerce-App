# Sprint 4 API Guide

Sprint 4 introduces GreenCraft visual search: buyers upload a reference image, the API extracts image features, queries `pgvector`, blends similarity with marketplace relevance, and falls back to Redis-backed recommendation sets when the match is still cold.

## Visual search endpoints

- `POST /api/v1/visual-search/query`
- `GET /api/v1/visual-search/recommendations/:slug`

## Upload query model

- Uploads use `multipart/form-data`
- The file field name is `image`
- Filter fields accept comma-separated values for:
  - `category`
  - `material`
  - `ecoRating`
  - `artisan`
- Optional numeric filters:
  - `minImpactScore`
  - `maxPrice`
  - `limit`

## Example upload request fields

```text
image=<binary file>
category=lighting-and-decor
material=river-reed
minImpactScore=80
limit=6
```

## Response behavior

- Successful vector matches include:
  - `similarity`
  - `hybridScore`
  - `sourceStrategy`
  - `matchReasons`
- When the leading match is weak, the API returns:
  - `fallbackMode: redis-cold-start`
  - cached category or discovery recommendations

## Recommendation endpoint

`GET /api/v1/visual-search/recommendations/:slug` returns precomputed visually similar products for a published item. These recommendations are currently surfaced on the product detail page in the Angular storefront.

## Indexing model

- Product vectors are generated lazily on the first visual-search request
- Product create and update events also trigger visual index refreshes
- The index stores vectors in PostgreSQL `pgvector`
- Redis stores:
  - visually similar product IDs
  - category fallback sets
  - default discovery fallback sets

## Implementation notes

- `sharp` extracts the uploaded image features
- Product vectors use a hybrid of image-derived and synthetic metadata-derived features
- When product images cannot be fetched, a synthetic vector is generated from category, materials, artisan, and color-family metadata

## Verification

- `npm run build:api`
- `npm run test:api -- --runInBand`
- `cd apps/api && npm run test:e2e`
- `npm run build:web`
- `npm run test:web -- --watch=false --browsers=ChromeHeadless --progress=false`
