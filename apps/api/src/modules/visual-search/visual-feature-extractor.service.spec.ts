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
    expect(result.vector.some((value) => value < 0)).toBe(true);
    expect(result.vector.some((value) => value > 0)).toBe(true);
  });

  it('separates distinct color compositions more clearly than the old positive-only vector', async () => {
    const warmBuffer = await sharp({
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
    const coolBuffer = await sharp({
      create: {
        width: 24,
        height: 24,
        channels: 3,
        background: {
          r: 40,
          g: 120,
          b: 190,
        },
      },
    })
      .png()
      .toBuffer();

    const warmResult = await service.extractFromBuffer(warmBuffer);
    const coolResult = await service.extractFromBuffer(coolBuffer);
    const similarity = warmResult.vector.reduce(
      (sum, value, index) => sum + value * coolResult.vector[index]!,
      0,
    );

    expect(similarity).toBeLessThan(0.2);
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
