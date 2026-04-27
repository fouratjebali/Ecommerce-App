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
      artisans: artisans.map((artisan) => ({
        ...artisan,
        specialty: translateStorefrontLabel(artisan.specialty),
        impactBadge: translateStorefrontLabel(artisan.impactBadge),
      })),
      initiatives: overview.initiatives,
    };
  }
}

function translateStorefrontLabel(value: string) {
  switch (value) {
    case 'Tableware':
      return 'Art de la table';
    case 'Bags & Accessories':
      return 'Sacs et accessoires';
    case 'Lighting & Decor':
      return 'Luminaires et decoration';
    case 'Wearables':
      return 'Accessoires textiles';
    case 'Home Objects':
      return 'Objets pour la maison';
    case 'Verified sustainable studio':
      return 'Atelier durable verifie';
    case 'Kiln co-op partner':
      return 'Partenaire de four mutualise';
    case 'Deadstock rescue leader':
      return 'Leader du deadstock revalorise';
    case 'Low-waste weave studio':
      return 'Atelier de tissage faible dechet';
    case 'PENDING':
      return 'En attente';
    case 'ACTIVE':
      return 'Actif';
    default:
      return value;
  }
}
