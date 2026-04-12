import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProductDetailResponse } from '../../models/catalog';
import { VisualSearchRecommendationsResponse } from '../../models/visual-search';
import { CartApiService } from '../../services/cart-api.service';
import { CatalogApiService } from '../../services/catalog-api.service';
import { VisualSearchApiService } from '../../services/visual-search-api.service';

interface NoticeState {
  tone: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-product-detail-page',
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './product-detail-page.html',
  styleUrl: './product-detail-page.scss',
})
export class ProductDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogApiService = inject(CatalogApiService);
  private readonly cartApiService = inject(CartApiService);
  private readonly visualSearchApiService = inject(VisualSearchApiService);

  protected readonly productDetail = signal<ProductDetailResponse | null>(null);
  protected readonly visualRecommendations =
    signal<VisualSearchRecommendationsResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly notice = signal<NoticeState | null>(null);
  protected quantity = 1;

  constructor() {
    void this.loadProduct();
  }

  protected async addToCart() {
    const productId = this.productDetail()?.product.id;

    if (!productId) {
      return;
    }

    this.notice.set(null);

    try {
      await firstValueFrom(this.cartApiService.addItem(productId, this.quantity));
      this.notice.set({
        tone: 'success',
        text: 'Product added to the cart session.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'This product could not be reserved in the cart.',
      });
    }
  }

  private async loadProduct() {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug) {
      this.loading.set(false);
      return;
    }

    try {
      const detail = await firstValueFrom(this.catalogApiService.getProduct(slug));
      this.productDetail.set(detail);

      try {
        this.visualRecommendations.set(
          await firstValueFrom(this.visualSearchApiService.getRecommendations(slug, 4)),
        );
      } catch {
        this.visualRecommendations.set(null);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
