import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { VisualFeatureExtractorService } from './visual-feature-extractor.service';

describe('VisualFeatureExtractorService', () => {
  let service: VisualFeatureExtractorService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VisualFeatureExtractorService,
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string) => 192,
          },
        },
      ],
    }).compile();

    service = moduleRef.get(VisualFeatureExtractorService);
  });

  it('extracts a normalized vector from an uploaded image buffer', async () => {
    const buffer = await sharp({
      create: {
        width: 24,
        height: 24,
        channels: 3,
        background: {
          r: 190,
          g: 120,
          b: 90,
        },
      },
    })
      .png()
      .toBuffer();

    const result = await service.extractFromBuffer(buffer);

    expect(result.vector).toHaveLength(192);
    expect(result.source).toBe('image');
    expect(result.dominantColorHex).toMatch(/^#/);
  });

  it('falls back to a synthetic embedding when the product image cannot be fetched', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('offline'));

    const result = await service.extractFromProduct({
      productId: 'product-1',
      slug: 'bloom-serving-bowl',
      name: 'Bloom Serving Bowl',
      imageUrl: 'https://example.com/bowl.png',
      categorySlug: 'tableware',
      ecoRatingCode: 'earth-positive',
      artisanSlug: 'noura-clay-studio',
      colorFamily: 'terracotta',
      materialNames: ['Recycled Stoneware'],
    });

    expect(result.vector).toHaveLength(192);
    expect(result.source).toBe('synthetic');
    expect(result.dominantColorHex).toMatch(/^#/);

    fetchSpy.mockRestore();
  });
});
