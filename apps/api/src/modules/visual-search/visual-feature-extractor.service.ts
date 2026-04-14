import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import type { AppEnvironment } from '../../config/environment';
import { clampVector } from './visual-search.sql';
import type {
  VisualEmbedding,
  VisualSearchIndexInput,
} from './visual-search.types';

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;
const GRID_CHANNELS = 3;
const DEFAULT_SYNTHETIC_COLOR: [number, number, number] = [0.71, 0.66, 0.58];

@Injectable()
export class VisualFeatureExtractorService {
  constructor(private readonly configService: ConfigService<AppEnvironment>) {}

  async extractFromBuffer(buffer: Buffer): Promise<VisualEmbedding> {
    const flattenedVector = await this.extractImageVector(buffer);
    const fittedVector = this.fitVectorDimensions(flattenedVector);

    return {
      vector: toSearchVector(fittedVector),
      dominantColorHex: toHexColor(fittedVector),
      source: 'image',
    };
  }

  async extractFromProduct(
    input: VisualSearchIndexInput,
  ): Promise<VisualEmbedding> {
    const syntheticVector = this.buildSyntheticVector(input);
    const imageUrl = input.imageUrl?.trim();

    if (!imageUrl) {
      return {
        vector: toSearchVector(syntheticVector),
        dominantColorHex: toHexColor(syntheticVector),
        source: 'synthetic',
      };
    }

    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`Image fetch failed with ${response.status}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const imageVector = await this.extractImageVector(imageBuffer);
      const fittedImageVector = this.fitVectorDimensions(imageVector);
      const blendedVector = blendVectors(
        fittedImageVector,
        syntheticVector,
        0.9,
      );

      return {
        vector: toSearchVector(blendedVector),
        dominantColorHex: toHexColor(blendedVector),
        source: 'hybrid',
      };
    } catch {
      return {
        vector: toSearchVector(syntheticVector),
        dominantColorHex: toHexColor(syntheticVector),
        source: 'synthetic',
      };
    }
  }

  private async extractImageVector(buffer: Buffer) {
    const { data } = await sharp(buffer)
      .resize(GRID_WIDTH, GRID_HEIGHT, {
        fit: 'cover',
      })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return clampVector(Array.from(data, (value) => value / 255));
  }

  private buildSyntheticVector(input: VisualSearchIndexInput) {
    const targetDimensions = this.getVectorDimensions();
    const palette = resolveColorPalette(input.colorFamily);
    const vector = new Array(targetDimensions).fill(0);
    const seedTerms = [
      input.slug,
      input.name,
      input.categorySlug,
      input.ecoRatingCode,
      input.artisanSlug,
      ...input.materialNames,
    ];

    for (let index = 0; index < targetDimensions; index += GRID_CHANNELS) {
      const pixelIndex = Math.floor(index / GRID_CHANNELS);
      const noise = hashToUnit(`${seedTerms.join('|')}:${pixelIndex}`);
      const stripe = pixelIndex % GRID_WIDTH;
      const band = Math.floor(pixelIndex / GRID_WIDTH);
      const variation = (noise - 0.5) * 0.18;
      const stripeBoost = stripe % 2 === 0 ? 0.03 : -0.02;
      const bandBoost = band / GRID_HEIGHT / 10;

      vector[index] = clampChannel(palette[0] + variation + stripeBoost);

      if (index + 1 < targetDimensions) {
        vector[index + 1] = clampChannel(
          palette[1] + variation / 2 + bandBoost,
        );
      }

      if (index + 2 < targetDimensions) {
        vector[index + 2] = clampChannel(
          palette[2] + variation / 3 + (noise > 0.7 ? 0.04 : 0),
        );
      }
    }

    return vector;
  }

  private fitVectorDimensions(vector: number[]) {
    const targetDimensions = this.getVectorDimensions();

    if (vector.length === targetDimensions) {
      return vector;
    }

    if (vector.length > targetDimensions) {
      return vector.slice(0, targetDimensions);
    }

    const averageValue =
      vector.reduce((sum, value) => sum + value, 0) /
      Math.max(vector.length, 1);
    const nextVector = [...vector];

    while (nextVector.length < targetDimensions) {
      nextVector.push(averageValue);
    }

    return nextVector;
  }

  private getVectorDimensions() {
    return this.configService.get('VISUAL_SEARCH_VECTOR_DIMENSIONS', {
      infer: true,
    })!;
  }
}

function resolveColorPalette(colorFamily: string | null) {
  const palette = colorFamily?.toLowerCase();

  switch (palette) {
    case 'terracotta':
      return [0.74, 0.45, 0.32] as [number, number, number];
    case 'olive':
      return [0.44, 0.5, 0.27] as [number, number, number];
    case 'sand':
      return [0.79, 0.73, 0.61] as [number, number, number];
    case 'natural':
      return [0.67, 0.63, 0.48] as [number, number, number];
    default:
      return DEFAULT_SYNTHETIC_COLOR;
  }
}

function blendVectors(
  primaryVector: number[],
  secondaryVector: number[],
  primaryWeight: number,
) {
  const size = Math.min(primaryVector.length, secondaryVector.length);
  const blended = new Array(size);

  for (let index = 0; index < size; index += 1) {
    blended[index] =
      primaryVector[index]! * primaryWeight +
      secondaryVector[index]! * (1 - primaryWeight);
  }

  return clampVector(blended);
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );

  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

function toSearchVector(vector: number[]) {
  const centeredVector = centerVector(vector);
  const normalizedCenteredVector = normalizeVector(centeredVector);

  if (normalizedCenteredVector.some((value) => Math.abs(value) > 0.000001)) {
    return normalizedCenteredVector;
  }

  return normalizeVector(vector.map((value) => value - 0.5));
}

function centerVector(vector: number[]) {
  const mean =
    vector.reduce((sum, value) => sum + value, 0) / Math.max(vector.length, 1);

  return vector.map((value) => value - mean);
}

function toHexColor(vector: number[]) {
  const [r, g, b] = averageRgb(vector);

  return `#${[r, g, b]
    .map((value) =>
      Math.round(value * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function averageRgb(vector: number[]) {
  let red = 0;
  let green = 0;
  let blue = 0;
  let triplets = 0;

  for (let index = 0; index < vector.length; index += GRID_CHANNELS) {
    red += vector[index] ?? 0;
    green += vector[index + 1] ?? 0;
    blue += vector[index + 2] ?? 0;
    triplets += 1;
  }

  if (!triplets) {
    return DEFAULT_SYNTHETIC_COLOR;
  }

  return [red / triplets, green / triplets, blue / triplets] as [
    number,
    number,
    number,
  ];
}

function hashToUnit(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function clampChannel(value: number) {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}
