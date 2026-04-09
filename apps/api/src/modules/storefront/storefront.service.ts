import { Injectable } from '@nestjs/common';
import { ArtisansService } from '../artisans/artisans.service';
import { CatalogService } from '../catalog/catalog.service';
import { PlatformService } from '../platform/platform.service';
import { storefrontSnapshot } from './storefront.data';

@Injectable()
export class StorefrontService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly artisansService: ArtisansService,
    private readonly platformService: PlatformService,
  ) {}

  getHomepage() {
    return {
      hero: storefrontSnapshot.hero,
      metrics: this.platformService.getOverview().metrics,
      categories: this.catalogService.getHighlights().categories,
      featuredProducts: this.catalogService.getHighlights().featuredProducts,
      artisans: this.artisansService.getFeatured(),
      initiatives: this.platformService.getOverview().initiatives,
    };
  }
}
