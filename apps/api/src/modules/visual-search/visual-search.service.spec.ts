import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VisualFeatureExtractorService } from './visual-feature-extractor.service';
import { VisualSearchCacheService } from './visual-search-cache.service';
import { VisualSearchService } from './visual-search.service';

const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 'product-1',
  slug: 'bloom-serving-bowl',
  name: 'Bloom Serving Bowl',
  shortDescription: 'Handmade bowl',
  status: ProductStatus.PUBLISHED,
  currency: 'USD',
  priceInCents: 5800,
  impactScore: 95,
  co2SavedKg: 5.6,
  leadTimeDays: 4,
  isFeatured: true,
  categoryId: 'category-1',
  ecoRatingId: 'eco-1',
  artisanId: 'artisan-1',
  artisan: {
    slug: 'noura-clay-studio',
    studioName: 'Noura Clay Studio',
    location: 'Tangier, Morocco',
  },
  category: {
    slug: 'tableware',
    name: 'Tableware',
  },
  ecoRating: {
    code: 'earth-positive',
    label: 'Earth Positive',
    score: 96,
  },
  materials: [
    {
      materialTag: {
        id: 'mat-1',
        slug: 'recycled-stoneware',
        name: 'Recycled Stoneware',
      },
    },
  ],
  images: [
    {
      url: 'https://example.com/bowl.png',
      alt: 'Bloom bowl',
    },
  ],
  attributes: [
    {
      definition: {
        code: 'color-family',
      },
      option: {
        value: 'terracotta',
      },
    },
  ],
  createdAt: new Date('2026-04-12T00:00:00.000Z'),
  ...overrides,
});

describe('VisualSearchService', () => {
  let service: VisualSearchService;
  let prisma: {
    product: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    $executeRawUnsafe: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let cache: {
    getCategoryFallbackIds: jest.Mock;
    getDiscoveryFallbackIds: jest.Mock;
    getSimilarProductIds: jest.Mock;
    setSimilarProductIds: jest.Mock;
    setCategoryFallbackIds: jest.Mock;
    setDiscoveryFallbackIds: jest.Mock;
  };
  let extractor: {
    extractFromBuffer: jest.Mock;
    extractFromProduct: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $executeRawUnsafe: jest.fn(),
      $queryRaw: jest.fn(),
    };

    cache = {
      getCategoryFallbackIds: jest.fn(),
      getDiscoveryFallbackIds: jest.fn(),
      getSimilarProductIds: jest.fn(),
      setSimilarProductIds: jest.fn(),
      setCategoryFallbackIds: jest.fn(),
      setDiscoveryFallbackIds: jest.fn(),
    };

    extractor = {
      extractFromBuffer: jest.fn(),
      extractFromProduct: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VisualSearchService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              switch (key) {
                case 'VISUAL_SEARCH_VECTOR_DIMENSIONS':
                  return 192;
                case 'VISUAL_SEARCH_DEFAULT_LIMIT':
                  return 8;
                case 'VISUAL_SEARCH_CACHE_TTL_MINUTES':
                  return 360;
                default:
                  return undefined;
              }
            },
          },
        },
        {
          provide: VisualSearchCacheService,
          useValue: cache,
        },
        {
          provide: VisualFeatureExtractorService,
          useValue: extractor,
        },
      ],
    }).compile();

    service = moduleRef.get(VisualSearchService);
  });

  it('returns ranked vector matches when similarity is strong', async () => {
    jest
      .spyOn(service as never, 'ensureCatalogIndex')
      .mockResolvedValue(undefined);
    extractor.extractFromBuffer.mockResolvedValue({
      vector: new Array(192).fill(0.1),
      dominantColorHex: '#aa7744',
      source: 'image',
    });
    prisma.$queryRaw.mockResolvedValue([
      {
        productId: 'product-1',
        similarity: 0.92,
        sourceStrategy: 'hybrid',
      },
    ]);
    prisma.product.findMany.mockResolvedValue([makeProduct()]);

    const result = await service.searchByImage(
      {
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
      } as Express.Multer.File,
      {
        category: ['tableware'],
        limit: 6,
      },
    );

    expect(result.query.fallbackMode).toBeNull();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.visualMatch.similarity).toBe(0.92);
    expect(result.items[0]?.visualMatch.hybridScore).toBeGreaterThan(0.9);
  });

  it('falls back to cached category recommendations when similarity is weak', async () => {
    jest
      .spyOn(service as never, 'ensureCatalogIndex')
      .mockResolvedValue(undefined);
    extractor.extractFromBuffer.mockResolvedValue({
      vector: new Array(192).fill(0.1),
      dominantColorHex: '#667744',
      source: 'image',
    });
    prisma.$queryRaw.mockResolvedValue([
      {
        productId: 'product-1',
        similarity: 0.31,
        sourceStrategy: 'synthetic',
      },
    ]);
    cache.getCategoryFallbackIds.mockResolvedValue(['product-1']);
    prisma.product.findMany.mockResolvedValue([makeProduct()]);

    const result = await service.searchByImage(
      {
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
      } as Express.Multer.File,
      {
        category: ['tableware'],
      },
    );

    expect(result.query.fallbackMode).toBe('redis-cold-start');
    expect(result.items[0]?.visualMatch.isFallback).toBe(true);
    expect(cache.getCategoryFallbackIds).toHaveBeenCalledWith('tableware');
  });
});
