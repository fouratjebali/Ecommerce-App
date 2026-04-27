import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogFacetsResponse } from '../../models/catalog';
import { MarketLabelPipe } from '../../pipes/market-label.pipe';
import { TndCurrencyPipe } from '../../pipes/tnd-currency.pipe';
import { VisualSearchFilters, VisualSearchResponse } from '../../models/visual-search';
import { CartApiService } from '../../services/cart-api.service';
import { CatalogApiService } from '../../services/catalog-api.service';
import { VisualSearchApiService } from '../../services/visual-search-api.service';

interface NoticeState {
  tone: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-visual-search-page',
  imports: [CommonModule, FormsModule, RouterLink, DecimalPipe, TndCurrencyPipe, MarketLabelPipe],
  templateUrl: './visual-search-page.html',
  styleUrl: './visual-search-page.scss',
})
export class VisualSearchPageComponent implements OnDestroy {
  private readonly catalogApiService = inject(CatalogApiService);
  private readonly visualSearchApiService = inject(VisualSearchApiService);
  private readonly cartApiService = inject(CartApiService);

  protected readonly facets = signal<CatalogFacetsResponse | null>(null);
  protected readonly results = signal<VisualSearchResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly loadingFacets = signal(true);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly fileName = signal<string | null>(null);
  protected readonly notice = signal<NoticeState | null>(null);

  protected readonly filters = signal<VisualSearchFilters>({
    category: [],
    material: [],
    ecoRating: [],
    artisan: [],
    minImpactScore: 50,
    maxPrice: null,
    limit: 8,
  });

  private selectedFile: File | null = null;
  private activePreviewUrl: string | null = null;

  constructor() {
    void this.loadFacets();
  }

  ngOnDestroy() {
    this.clearPreviewUrl();
  }

  protected async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    this.applySelectedFile(file);
  }

  protected clearSelectedFile() {
    this.selectedFile = null;
    this.fileName.set(null);
    this.clearPreviewUrl();
    this.results.set(null);
  }

  protected async runSearch() {
    if (!this.selectedFile) {
      this.notice.set({
        tone: 'error',
        text: 'Choisissez une photo avant de lancer la recherche visuelle.',
      });
      return;
    }

    this.loading.set(true);
    this.notice.set(null);

    try {
      this.results.set(
        await firstValueFrom(
          this.visualSearchApiService.searchByImage(this.selectedFile, this.filters()),
        ),
      );
    } catch {
      this.notice.set({
        tone: 'error',
        text: "La recherche visuelle n'a pas pu aboutir pour le moment.",
      });
    } finally {
      this.loading.set(false);
    }
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

  protected setMinImpactScore(value: string | number) {
    this.filters.update((filters) => ({
      ...filters,
      minImpactScore: Number(value),
    }));
  }

  protected setMaxPrice(value: string) {
    this.filters.update((filters) => ({
      ...filters,
      maxPrice: value === '' ? null : Number(value),
    }));
  }

  protected setLimit(value: string) {
    this.filters.update((filters) => ({
      ...filters,
      limit: Number(value),
    }));
  }

  protected async addToCart(productId: string) {
    this.notice.set(null);

    try {
      await firstValueFrom(this.cartApiService.addItem(productId, 1));
      this.notice.set({
        tone: 'success',
        text: 'Le produit correspondant a ete ajoute a votre panier.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: "Impossible d'ajouter le produit correspondant au panier.",
      });
    }
  }

  private async loadFacets() {
    try {
      this.facets.set(await firstValueFrom(this.catalogApiService.getFacets()));
    } finally {
      this.loadingFacets.set(false);
    }
  }

  private applySelectedFile(file: File | null) {
    this.selectedFile = file;
    this.fileName.set(file?.name ?? null);
    this.results.set(null);

    this.clearPreviewUrl();

    if (!file) {
      return;
    }

    this.activePreviewUrl = URL.createObjectURL(file);
    this.previewUrl.set(this.activePreviewUrl);
  }

  private clearPreviewUrl() {
    if (this.activePreviewUrl) {
      URL.revokeObjectURL(this.activePreviewUrl);
      this.activePreviewUrl = null;
    }

    this.previewUrl.set(null);
  }

  private toggleListFilter(
    key: 'category' | 'material' | 'ecoRating' | 'artisan',
    value: string,
  ) {
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
