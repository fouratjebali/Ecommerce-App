# Sprint 2 API Guide

## Auth and identity

- `POST /api/v1/auth/register/buyer` creates a buyer account and returns a JWT
- `POST /api/v1/auth/register/artisan` creates a user plus artisan profile and returns a JWT
- `POST /api/v1/auth/login` authenticates an existing account
- `GET /api/v1/auth/me` returns the authenticated user summary

## Public marketplace catalog

- `GET /api/v1/catalog` returns the Prisma-backed public product list
- `GET /api/v1/catalog/facets` returns categories, eco ratings, artisans, materials, and attribute counts
- `GET /api/v1/catalog/highlights` feeds the storefront editorial sections
- `GET /api/v1/catalog/:slug` returns the detailed product payload for the product page
- `GET /api/v1/artisans` and `GET /api/v1/artisans/:slug` expose public artisan profile data

## Vendor APIs

These endpoints require a valid bearer token for an artisan account:

- `GET /api/v1/vendors/me/dashboard`
- `GET /api/v1/vendors/me/profile`
- `PATCH /api/v1/vendors/me/profile`
- `GET /api/v1/catalog/vendor/attributes`
- `GET /api/v1/catalog/vendor/products`
- `POST /api/v1/catalog/vendor/products`
- `PATCH /api/v1/catalog/vendor/products/:id`

## Seeded accounts

- Artisan: `noura@greencraft.local / Artisan@1234`
- Buyer: `buyer@greencraft.local / Buyer@1234`
- Admin: `admin@greencraft.local / Admin@1234`

## Frontend routes using these APIs

- `/auth` for login and registration
- `/catalog` for faceted browsing
- `/catalog/:slug` for product detail
- `/vendor` for the artisan workspace
