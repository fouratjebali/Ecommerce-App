import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogFacetsResponse, CatalogFilters, CatalogResponse } from '../../models/catalog';
import { CatalogApiService } from '../../services/catalog-api.service';

@Component({
  selector: 'app-catalog-page',
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss',
})
export class CatalogPageComponent {
  private readonly catalogApiService = inject(CatalogApiService);

  protected readonly facets = signal<CatalogFacetsResponse | null>(null);
  protected readonly catalog = signal<CatalogResponse | null>(null);
  protected readonly loading = signal(true);

  protected readonly filters = signal<CatalogFilters>({
    q: '',
    category: [],
    material: [],
    ecoRating: [],
    artisan: [],
    minImpactScore: null,
    madeToOrder: null,
    sort: 'featured',
  });

  constructor() {
    void this.loadFacets();

    effect(() => {
      const filters = this.filters();
      void this.loadCatalog(filters);
    });
  }

  protected updateSearch(value: string) {
    this.filters.update((filters) => ({
      ...filters,
      q: value,
    }));
  }

  protected toggleCategory(slug: string) {
    this.toggleListFilter('category', slug);
  }

  protected toggleMaterial(slug: string) {
    this.toggleListFilter('material', slug);
  }

  protected toggleEcoRating(code: string) {
    this.toggleListFilter('ecoRating', code);
  }

  protected toggleArtisan(slug: string) {
    this.toggleListFilter('artisan', slug);
  }

  protected setSort(sort: CatalogFilters['sort']) {
    this.filters.update((filters) => ({
      ...filters,
      sort,
    }));
  }

  protected setMinImpactScore(value: string | number) {
    this.filters.update((filters) => ({
      ...filters,
      minImpactScore: value === '' ? null : Number(value),
    }));
  }

  protected setMadeToOrder(value: string) {
    this.filters.update((filters) => ({
      ...filters,
      madeToOrder: value === '' ? null : value === 'true',
    }));
  }

  protected resetFilters() {
    this.filters.set({
      q: '',
      category: [],
      material: [],
      ecoRating: [],
      artisan: [],
      minImpactScore: null,
      madeToOrder: null,
      sort: 'featured',
    });
  }

  private async loadFacets() {
    this.facets.set(await firstValueFrom(this.catalogApiService.getFacets()));
  }

  private async loadCatalog(filters: CatalogFilters) {
    this.loading.set(true);

    try {
      this.catalog.set(await firstValueFrom(this.catalogApiService.getCatalog(filters)));
    } finally {
      this.loading.set(false);
    }
  }

  private toggleListFilter(key: 'category' | 'material' | 'ecoRating' | 'artisan', value: string) {
    this.filters.update((filters) => {
      const current = filters[key] ?? [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return {
        ...filters,
        [key]: next,
      };
    });
  }
}
