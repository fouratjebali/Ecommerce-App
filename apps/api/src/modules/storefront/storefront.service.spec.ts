import { Test } from '@nestjs/testing';
import { ArtisansService } from '../artisans/artisans.service';
import { CatalogService } from '../catalog/catalog.service';
import { PlatformService } from '../platform/platform.service';
import { StorefrontService } from './storefront.service';

describe('StorefrontService', () => {
  let storefrontService: StorefrontService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StorefrontService,
        CatalogService,
        ArtisansService,
        PlatformService,
      ],
    }).compile();

    storefrontService = moduleRef.get(StorefrontService);
  });

  it('returns the Sprint 1 homepage payload', () => {
    const homepage = storefrontService.getHomepage();

    expect(homepage.hero.title).toContain('sustainable marketplace');
    expect(homepage.categories).toHaveLength(3);
    expect(homepage.featuredProducts[0].impactScore).toBeGreaterThan(90);
    expect(homepage.artisans[1].impactBadge).toBe('Deadstock rescue leader');
  });
});
