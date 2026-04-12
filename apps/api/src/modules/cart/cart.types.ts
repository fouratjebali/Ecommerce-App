export interface CartSessionItemRecord {
  productId: string;
  quantity: number;
}

export interface CartSessionRecord {
  couponCode: string | null;
  items: CartSessionItemRecord[];
  updatedAt: string;
}

export interface CartCouponSummary {
  id: string;
  code: string;
  label: string;
  description: string;
  discountInCents: number;
}

export interface CartResponseItem {
  productId: string;
  slug: string;
  name: string;
  artisan: {
    slug: string;
    studioName: string;
  };
  imageUrl: string | null;
  imageAlt: string;
  price: {
    amountInCents: number;
    currency: string;
  };
  quantity: number;
  lineTotalInCents: number;
  impactScore: number;
  co2SavedKg: number;
  inventoryCount: number;
  reservationExpiresAt: string | null;
}

export interface CartResponse {
  sessionId: string;
  items: CartResponseItem[];
  coupon: CartCouponSummary | null;
  summary: {
    itemCount: number;
    distinctItems: number;
    subtotalInCents: number;
    couponDiscountInCents: number;
    bundleDiscountInCents: number;
    totalInCents: number;
    totalCo2SavedKg: number;
    bundleEligible: boolean;
    bundleDiscountPercent: number;
  };
}

export interface CheckoutCartSnapshot extends CartResponse {
  couponForOrder: {
    id: string;
    code: string;
  } | null;
}
