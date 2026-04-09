import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  CatalogFacetsResponse,
  CatalogFilters,
  CatalogResponse,
  ProductDetailResponse,
  VendorAttributeOptionsResponse,
  VendorProductPayload,
  VendorProductsResponse,
} from '../models/catalog';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  getCatalog(filters: CatalogFilters) {
    let params = new HttpParams();

    if (filters.q) {
      params = params.set('q', filters.q);
    }

    if (filters.category?.length) {
      params = params.set('category', filters.category.join(','));
    }

    if (filters.material?.length) {
      params = params.set('material', filters.material.join(','));
    }

    if (filters.ecoRating?.length) {
      params = params.set('ecoRating', filters.ecoRating.join(','));
    }

    if (filters.artisan?.length) {
      params = params.set('artisan', filters.artisan.join(','));
    }

    if (filters.minImpactScore !== undefined && filters.minImpactScore !== null) {
      params = params.set('minImpactScore', filters.minImpactScore);
    }

    if (filters.madeToOrder !== undefined && filters.madeToOrder !== null) {
      params = params.set('madeToOrder', filters.madeToOrder);
    }

    if (filters.sort) {
      params = params.set('sort', filters.sort);
    }

    return this.http.get<CatalogResponse>('/api/v1/catalog', { params });
  }

  getFacets() {
    return this.http.get<CatalogFacetsResponse>('/api/v1/catalog/facets');
  }

  getProduct(slug: string) {
    return this.http.get<ProductDetailResponse>(`/api/v1/catalog/${slug}`);
  }

  getVendorAttributeOptions() {
    return this.http.get<VendorAttributeOptionsResponse>(
      '/api/v1/catalog/vendor/attributes',
    );
  }

  getVendorProducts() {
    return this.http.get<VendorProductsResponse>('/api/v1/catalog/vendor/products');
  }

  createVendorProduct(payload: VendorProductPayload) {
    return this.http.post<{ product: unknown }>(
      '/api/v1/catalog/vendor/products',
      payload,
    );
  }

  updateVendorProduct(productId: string, payload: VendorProductPayload) {
    return this.http.patch<{ product: unknown }>(
      `/api/v1/catalog/vendor/products/${productId}`,
      payload,
    );
  }
}
