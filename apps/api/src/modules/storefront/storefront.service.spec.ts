import { StorefrontService } from './storefront.service';

describe('StorefrontService', () => {
  let storefrontService: StorefrontService;

  beforeEach(() => {
    storefrontService = new StorefrontService(
      {
        getHighlights: jest.fn().mockResolvedValue({
          categories: [
            { slug: 'tableware' },
            { slug: 'bags-and-accessories' },
            { slug: 'lighting-and-decor' },
          ],
          featuredProducts: [{ impactScore: 95 }],
        }),
      } as never,
      {
        getFeatured: jest
          .fn()
          .mockResolvedValue([
            { impactBadge: 'Kiln co-op partner' },
            { impactBadge: 'Deadstock rescue leader' },
          ]),
      } as never,
      {
        getOverview: jest.fn().mockResolvedValue({
          metrics: [{ value: '3' }],
          initiatives: [{ milestone: 'Sprint 2 foundation' }],
        }),
      } as never,
    );
  });

  it('returns the Sprint 2 homepage payload', async () => {
    const homepage = await storefrontService.getHomepage();

    expect(homepage.hero.title).toContain('sustainable marketplace');
    expect(homepage.categories).toHaveLength(3);
    expect(homepage.featuredProducts[0].impactScore).toBeGreaterThan(90);
    expect(homepage.artisans[1].impactBadge).toBe('Deadstock rescue leader');
  });
});
