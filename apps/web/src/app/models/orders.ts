export interface BuyerOrder {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotalInCents: number;
  couponDiscountInCents: number;
  bundleDiscountInCents: number;
  totalInCents: number;
  placedAt: string;
  shipping: {
    name: string;
    email: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    postalCode: string;
    country: string;
  };
  coupon: {
    code: string;
    label: string;
  } | null;
  items: Array<{
    id: string;
    productName: string;
    productSlug: string;
    artisanStudioName: string;
    artisanSlug: string;
    artisanLocation: string;
    status: string;
    quantity: number;
    unitPriceInCents: number;
    lineTotalInCents: number;
    impactScore: number;
    co2SavedKg: number;
    currency: string;
  }>;
}

export interface BuyerOrdersResponse {
  items: BuyerOrder[];
}

export interface BuyerOrderResponse {
  order: BuyerOrder;
}

export interface CheckoutPayload {
  shippingName: string;
  shippingEmail: string;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  notes?: string;
}

export interface VendorOrderItemsResponse {
  items: Array<{
    id: string;
    orderNumber: string;
    orderStatus: string;
    itemStatus: string;
    placedAt: string;
    buyer: {
      fullName: string;
      email: string;
    };
    shippingCity: string;
    shippingCountry: string;
    productName: string;
    productSlug: string;
    quantity: number;
    lineTotalInCents: number;
    currency: string;
  }>;
}
