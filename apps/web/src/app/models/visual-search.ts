import { CatalogItem } from './catalog';

export interface VisualSearchFilters {
  category?: string[];
  material?: string[];
  ecoRating?: string[];
  artisan?: string[];
  minImpactScore?: number | null;
  maxPrice?: number | null;
  limit?: number;
}

export interface VisualSearchResultItem extends CatalogItem {
  visualMatch: {
    similarity: number | null;
    hybridScore: number | null;
    sourceStrategy: string;
    isFallback: boolean;
    matchReasons: string[];
  };
}

export interface VisualSearchResponse {
  query: {
    dominantColorHex: string;
    filtersApplied: {
      category: string[];
      material: string[];
      ecoRating: string[];
      artisan: string[];
      minImpactScore: number | null;
      maxPrice: number | null;
      limit: number;
    };
    fallbackMode: string | null;
    peakSimilarity?: number | null;
  };
  items: VisualSearchResultItem[];
}

export interface VisualSearchRecommendationsResponse {
  basisProduct: {
    id: string;
    slug: string;
    name: string;
  };
  items: VisualSearchResultItem[];
}
