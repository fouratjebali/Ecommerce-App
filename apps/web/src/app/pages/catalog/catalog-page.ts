import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogFacetsResponse, CatalogFilters, CatalogResponse } from '../../models/catalog';
import { MarketLabelPipe } from '../../pipes/market-label.pipe';
import { TndCurrencyPipe } from '../../pipes/tnd-currency.pipe';
import { CartApiService } from '../../services/cart-api.service';
import { CatalogApiService } from '../../services/catalog-api.service';

interface NoticeState {
  tone: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-catalog-page',
  imports: [CommonModule, FormsModule, RouterLink, TndCurrencyPipe, MarketLabelPipe],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss',
})
export class CatalogPageComponent {
  private readonly catalogApiService = inject(CatalogApiService);
  private readonly cartApiService = inject(CartApiService);

  protected readonly facets = signal<CatalogFacetsResponse | null>(null);
  protected readonly catalog = signal<CatalogResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly notice = signal<NoticeState | null>(null);

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

  protected async addToCart(productId: string) {
    this.notice.set(null);

    try {
      await firstValueFrom(this.cartApiService.addItem(productId, 1));
      this.notice.set({
        tone: 'success',
        text: 'Le produit a ete ajoute a votre panier.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: "Impossible d'ajouter ce produit au panier pour le moment.",
      });
    }
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
