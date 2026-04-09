import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProductDetailResponse } from '../../models/catalog';
import { CatalogApiService } from '../../services/catalog-api.service';

@Component({
  selector: 'app-product-detail-page',
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './product-detail-page.html',
  styleUrl: './product-detail-page.scss',
})
export class ProductDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogApiService = inject(CatalogApiService);

  protected readonly productDetail = signal<ProductDetailResponse | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    void this.loadProduct();
  }

  private async loadProduct() {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug) {
      this.loading.set(false);
      return;
    }

    try {
      this.productDetail.set(
        await firstValueFrom(this.catalogApiService.getProduct(slug)),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
