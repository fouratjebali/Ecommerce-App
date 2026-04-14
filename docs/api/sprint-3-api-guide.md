# Sprint 3 API Guide

Sprint 3 introduces the first transactional commerce flow in GreenCraft Marketplace: cart sessions, coupon handling, stock reservation, checkout, buyer orders, and artisan order management.

## Cart session model

- All cart endpoints use the `x-cart-session` header
- Cart sessions are stored in Redis when available
- The API falls back to in-memory storage for local development and test environments
- Reservation expiry is controlled by `CART_RESERVATION_TTL_MINUTES`

## Cart endpoints

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:productId`
- `DELETE /api/v1/cart/items/:productId`
- `POST /api/v1/cart/coupons/apply`
- `DELETE /api/v1/cart/coupons`
- `DELETE /api/v1/cart`

### Add item payload

```json
{
  "productId": "product_uuid",
  "quantity": 2
}
```

### Apply coupon payload

```json
{
  "code": "WELCOME10"
}
```

## Buyer order endpoints

- `GET /api/v1/orders`
- `GET /api/v1/orders/:orderNumber`
- `POST /api/v1/orders/checkout`
- `POST /api/v1/orders/:orderNumber/cancel`

### Checkout payload

```json
{
  "shippingName": "Buyer Example",
  "shippingEmail": "buyer@example.com",
  "shippingAddressLine1": "12 Eco Street",
  "shippingAddressLine2": "Unit 4",
  "shippingCity": "Tunis",
  "shippingPostalCode": "1000",
  "shippingCountry": "Tunisia",
  "notes": "Leave at concierge"
}
```

## Artisan OMS endpoints

- `GET /api/v1/orders/vendor/items`
- `PATCH /api/v1/orders/vendor/items/:itemId/status`

### Update item status payload

```json
{
  "status": "FULFILLING"
}
```

Supported item statuses:

- `CONFIRMED`
- `FULFILLING`
- `SHIPPED`
- `CANCELLED`

## Pricing behavior

- Bundle discounts activate when the cart contains at least 3 distinct items
- Bundle discount percentage is controlled by `BUNDLE_DISCOUNT_PERCENT`
- Coupon discounts are validated against product count, order thresholds, activity windows, and redemption limits
- Checkout persists subtotal, bundle discount, coupon discount, and final total on the order record

## Seed data for Sprint 3

- Buyer account: `buyer@greencraft.local / Buyer@1234`
- Artisan account: `noura@greencraft.local / Artisan@1234`
- Coupons: `WELCOME10`, `STUDIOBUNDLE`
- Existing seeded order: `GC-20260412-0001`

## Verification

- `npm run build:api`
- `npm run test:api -- --runInBand`
- `cd apps/api && npm run test:e2e`
- `npm run build:web`
- `npm run test:web -- --watch=false --browsers=ChromeHeadless`
