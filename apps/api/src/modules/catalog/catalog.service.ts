import { Injectable } from '@nestjs/common';
import { storefrontSnapshot } from '../storefront/storefront.data';

@Injectable()
export class CatalogService {
  getHighlights() {
    return {
      categories: storefrontSnapshot.categories,
      featuredProducts: storefrontSnapshot.featuredProducts,
    };
  }
}
