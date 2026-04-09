export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  artisan: {
    slug: string;
    studioName: string;
    location: string;
  };
  category: {
    slug: string;
    name: string;
  };
  ecoRating: {
    code: string;
    label: string;
    score: number;
  };
  materials: Array<{
    id: string;
    slug: string;
    name: string;
  }>;
  imageUrl: string | null;
  imageAlt: string;
  price: {
    amountInCents: number;
    currency: string;
  };
  impactScore: number;
  co2SavedKg: number;
  leadTimeDays: number;
  isFeatured: boolean;
}

export interface CatalogResponse {
  items: CatalogItem[];
  total: number;
  filtersApplied: Record<string, unknown>;
}

export interface CatalogFacetsResponse {
  categories: Array<{ slug: string; name: string; count: number }>;
  ecoRatings: Array<{
    code: string;
    label: string;
    score: number;
    count: number;
  }>;
  artisans: Array<{ slug: string; studioName: string; count: number }>;
  materials: Array<{ slug: string; name: string; count: number }>;
  attributes: Array<{
    id: string;
    code: string;
    label: string;
    kind: string;
    filterGroup: string;
    options: Array<{
      id: string;
      value: string;
      label: string;
      count: number;
    }>;
  }>;
}

export interface ProductDetailResponse {
  product: CatalogItem & {
    description: string;
    story: string;
    inventoryCount: number;
    attributes: Array<{
      id: string;
      code: string;
      label: string;
      value: string | number | boolean | null;
    }>;
  };
}

export interface CatalogFilters {
  q?: string;
  category?: string[];
  material?: string[];
  ecoRating?: string[];
  artisan?: string[];
  minImpactScore?: number | null;
  madeToOrder?: boolean | null;
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'impact-desc' | 'newest';
}

export interface VendorAttributeOptionsResponse {
  categories: Array<{ id: string; name: string }>;
  ecoRatings: Array<{ id: string; label: string; score: number }>;
  materials: Array<{ id: string; name: string }>;
  attributeDefinitions: Array<{
    id: string;
    code: string;
    label: string;
    kind: string;
    filterGroup: string;
    options: Array<{ id: string; label: string; value: string }>;
  }>;
  productStatuses: string[];
}

export interface VendorProduct {
  id: string;
  slug: string;
  name: string;
  status: string;
  categoryId: string;
  ecoRatingId: string;
  shortDescription: string;
  description: string;
  story: string;
  currency: string;
  priceInCents: number;
  inventoryCount: number;
  impactScore: number;
  co2SavedKg: number;
  leadTimeDays: number;
  isFeatured: boolean;
  imageUrl: string;
  imageAlt: string;
  materialIds: string[];
  attributeValues: Array<{
    definitionId: string;
    optionId?: string | null;
    valueText?: string | null;
    valueNumber?: number | null;
    valueBoolean?: boolean | null;
  }>;
  updatedAt: string;
}

export interface VendorProductsResponse {
  items: VendorProduct[];
}

export interface VendorProductPayload {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  story: string;
  categoryId: string;
  ecoRatingId: string;
  currency: string;
  priceInCents: number;
  inventoryCount: number;
  impactScore: number;
  co2SavedKg: number;
  leadTimeDays: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isFeatured: boolean;
  imageUrl: string;
  imageAlt: string;
  materialIds: string[];
  attributeValues: Array<{
    definitionId: string;
    optionId?: string | null;
    valueText?: string | null;
    valueNumber?: number | null;
    valueBoolean?: boolean | null;
  }>;
}
