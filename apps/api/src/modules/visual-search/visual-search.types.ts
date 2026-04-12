export type VisualEmbeddingSource = 'image' | 'synthetic' | 'hybrid';

export interface VisualEmbedding {
  vector: number[];
  dominantColorHex: string;
  source: VisualEmbeddingSource;
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
