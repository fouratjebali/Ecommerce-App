export interface CartItem {
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
  items: CartItem[];
  coupon: {
    id: string;
    code: string;
    label: string;
    description: string;
    discountInCents: number;
  } | null;
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

export interface ApplyCouponPayload {
  code: string;
}
