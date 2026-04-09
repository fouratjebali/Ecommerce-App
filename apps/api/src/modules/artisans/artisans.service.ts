import { Injectable } from '@nestjs/common';
import { storefrontSnapshot } from '../storefront/storefront.data';

@Injectable()
export class ArtisansService {
  getFeatured() {
    return storefrontSnapshot.artisans;
  }
}
