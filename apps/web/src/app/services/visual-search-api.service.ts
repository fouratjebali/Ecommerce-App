import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  VisualSearchFilters,
  VisualSearchRecommendationsResponse,
  VisualSearchResponse,
} from '../models/visual-search';

@Injectable({ providedIn: 'root' })
export class VisualSearchApiService {
  private readonly http = inject(HttpClient);

  searchByImage(file: File, filters: VisualSearchFilters) {
    const formData = new FormData();
    formData.append('image', file);

    if (filters.category?.length) {
      formData.append('category', filters.category.join(','));
    }

    if (filters.material?.length) {
      formData.append('material', filters.material.join(','));
    }

    if (filters.ecoRating?.length) {
      formData.append('ecoRating', filters.ecoRating.join(','));
    }

    if (filters.artisan?.length) {
      formData.append('artisan', filters.artisan.join(','));
    }

    if (filters.minImpactScore !== undefined && filters.minImpactScore !== null) {
      formData.append('minImpactScore', String(filters.minImpactScore));
    }

    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      formData.append('maxPrice', String(filters.maxPrice));
    }

    if (filters.limit !== undefined) {
      formData.append('limit', String(filters.limit));
    }

    return this.http.post<VisualSearchResponse>('/api/v1/visual-search/query', formData);
  }

  getRecommendations(slug: string, limit = 4) {
    const params = new HttpParams().set('limit', limit);

    return this.http.get<VisualSearchRecommendationsResponse>(
      `/api/v1/visual-search/recommendations/${slug}`,
      { params },
    );
  }
}
