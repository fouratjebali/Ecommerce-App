export type VisualEmbeddingSource = 'image' | 'synthetic' | 'hybrid';

export interface VisualEmbedding {
  vector: number[];
  dominantColorHex: string;
  source: VisualEmbeddingSource;
}

export interface VisualSearchIndexInput {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  categorySlug: string;
  ecoRatingCode: string;
  artisanSlug: string;
  colorFamily: string | null;
  materialNames: string[];
}

export interface VisualSearchFilters {
  category?: string[];
  material?: string[];
  ecoRating?: string[];
  artisan?: string[];
  minImpactScore?: number;
  maxPrice?: number;
  limit?: number;
}
