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

  async getHomepage() {
    const [highlights, artisans, overview] = await Promise.all([
      this.catalogService.getHighlights(),
      this.artisansService.getFeatured(),
      this.platformService.getOverview(),
    ]);

    return {
      hero: storefrontSnapshot.hero,
      metrics: overview.metrics,
      categories: highlights.categories,
      featuredProducts: highlights.featuredProducts,
      artisans,
      initiatives: overview.initiatives,
    };
  }
}
