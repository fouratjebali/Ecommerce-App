import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ProductStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  CraftmindContextBundle,
  CraftmindContextDocument,
} from './craftmind.types';
import { scoreTextMatch, tokenizeQuery } from './craftmind.helpers';

const craftmindProductInclude = {
  artisan: {
    include: {
      user: true,
    },
  },
  category: true,
  ecoRating: true,
  materials: {
    include: {
      materialTag: true,
    },
  },
} satisfies Prisma.ProductInclude;

type CraftmindProductRecord = Prisma.ProductGetPayload<{
  include: typeof craftmindProductInclude;
}>;

const craftmindArtisanInclude = {
  user: true,
  products: {
    include: craftmindProductInclude,
    orderBy: {
      updatedAt: 'desc',
    },
    take: 8,
  },
} satisfies Prisma.ArtisanProfileInclude;

type CraftmindArtisanProfileRecord = Prisma.ArtisanProfileGetPayload<{
  include: typeof craftmindArtisanInclude;
}>;

@Injectable()
export class CraftmindRetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async buildContext(
    user: AuthenticatedUser,
    query: string,
  ): Promise<CraftmindContextBundle> {
    const artisanProfileId = this.requireArtisanProfile(user);
    const retrievalLimit = this.configService.get<number>(
      'CRAFTMIND_RETRIEVAL_LIMIT',
      4,
    );
    const tokens = tokenizeQuery(query);

    const [artisanProfile, publishedProducts, materialTags] = await Promise.all([
      this.prisma.artisanProfile.findUnique({
        where: { id: artisanProfileId },
        include: craftmindArtisanInclude,
      }),
      this.prisma.product.findMany({
        where: {
          status: ProductStatus.PUBLISHED,
        },
        include: craftmindProductInclude,
        orderBy: [{ isFeatured: 'desc' }, { impactScore: 'desc' }],
        take: 10,
      }),
      this.prisma.materialTag.findMany({
        orderBy: {
          sustainabilityScore: 'desc',
        },
      }),
    ]);

    if (!artisanProfile) {
      throw new NotFoundException('Artisan profile not found for CraftMind.');
    }

    const scoredDocuments: CraftmindContextDocument[] = [
      this.buildArtisanProfileDocument(artisanProfile, tokens),
      this.buildGuidanceDocument(tokens),
      ...artisanProfile.products.map((product) =>
        this.buildProductDocument(product, 'vendor-product', tokens),
      ),
      ...publishedProducts
        .filter((product) => product.artisanId !== artisanProfile.id)
        .map((product) =>
          this.buildProductDocument(product, 'catalog-product', tokens),
        ),
      ...materialTags.map((materialTag) => {
        const snippet = `${materialTag.name} from ${materialTag.origin}. ${materialTag.description}`;
        return {
          id: materialTag.id,
          kind: 'material' as const,
          title: materialTag.name,
          snippet: truncate(snippet, 190),
          score:
            scoreTextMatch(
              `${materialTag.name} ${materialTag.origin} ${materialTag.description}`,
              tokens,
            ) +
            materialTag.sustainabilityScore / 100,
          metadata: {
            origin: materialTag.origin,
            sustainabilityScore: materialTag.sustainabilityScore,
          },
        };
      }),
    ];

    const pinnedDocuments = scoredDocuments.filter(
      (document) =>
        document.kind === 'artisan-profile' || document.kind === 'policy',
    );
    const rankedDocuments = scoredDocuments
      .filter((document) => !pinnedDocuments.includes(document))
      .sort((left, right) => right.score - left.score)
      .slice(0, retrievalLimit);

    const documents = [...pinnedDocuments, ...rankedDocuments];

    return {
      query,
      summary: `${artisanProfile.studioName} context plus ${rankedDocuments.length} marketplace references selected for "${query}".`,
      documents,
    };
  }

  async resolveListingMetadata(input: {
    categoryId?: string;
    ecoRatingId?: string;
    materialIds?: string[];
  }) {
    const [category, ecoRating, materialTags] = await Promise.all([
      input.categoryId
        ? this.prisma.category.findUnique({
            where: { id: input.categoryId },
          })
        : Promise.resolve(null),
      input.ecoRatingId
        ? this.prisma.ecoRating.findUnique({
            where: { id: input.ecoRatingId },
          })
        : Promise.resolve(null),
      input.materialIds?.length
        ? this.prisma.materialTag.findMany({
            where: {
              id: {
                in: input.materialIds,
              },
            },
            orderBy: {
              name: 'asc',
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      categoryName: category?.name ?? 'Handmade Goods',
      ecoRatingLabel: ecoRating?.label ?? null,
      materialNames: materialTags.map((materialTag) => materialTag.name),
    };
  }

  private requireArtisanProfile(user: AuthenticatedUser) {
    if (!user.artisanProfileId) {
      throw new ForbiddenException(
        'CraftMind is currently available for artisan accounts only.',
      );
    }

    return user.artisanProfileId;
  }

  private buildArtisanProfileDocument(
    artisanProfile: CraftmindArtisanProfileRecord,
    tokens: string[],
  ): CraftmindContextDocument {
    const searchable = [
      artisanProfile.studioName,
      artisanProfile.headline,
      artisanProfile.bio,
      artisanProfile.impactStatement,
      artisanProfile.location,
      artisanProfile.user.fullName,
    ].join(' ');

    return {
      id: artisanProfile.id,
      kind: 'artisan-profile',
      title: artisanProfile.studioName,
      snippet: truncate(
        `${artisanProfile.headline}. ${artisanProfile.bio} Impact focus: ${artisanProfile.impactStatement}`,
        220,
      ),
      score: 100 + scoreTextMatch(searchable, tokens),
      metadata: {
        location: artisanProfile.location,
        artisanName: artisanProfile.user.fullName,
        verificationStatus: artisanProfile.verificationStatus,
      },
    };
  }

  private buildGuidanceDocument(tokens: string[]): CraftmindContextDocument {
    return {
      id: 'craftmind-guidance',
      kind: 'policy',
      title: 'GreenCraft marketplace guidance',
      snippet:
        'Keep claims verifiable, foreground sourcing details, connect impact metrics to the actual product story, and avoid promising certifications or materials that are not in context.',
      score: 90 + tokens.length,
    };
  }

  private buildProductDocument(
    product: CraftmindProductRecord,
    kind: 'catalog-product' | 'vendor-product',
    tokens: string[],
  ): CraftmindContextDocument {
    const searchable = [
      product.name,
      product.shortDescription,
      product.description,
      product.story,
      product.category.name,
      product.ecoRating.label,
      product.artisan.studioName,
      ...product.materials.map((material) => material.materialTag.name),
    ].join(' ');

    const score =
      scoreTextMatch(searchable, tokens) +
      product.impactScore / 25 +
      (product.isFeatured ? 1.5 : 0);

    return {
      id: product.id,
      kind,
      title: product.name,
      snippet: truncate(
        `${product.shortDescription}. ${product.story} Materials: ${product.materials
          .map((material) => material.materialTag.name)
          .join(', ')}.`,
        220,
      ),
      score,
      metadata: {
        slug: product.slug,
        category: product.category.name,
        ecoRating: product.ecoRating.label,
        studioName: product.artisan.studioName,
        impactScore: product.impactScore,
      },
    };
  }
}

function truncate(value: string, length: number) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, Math.max(length - 1, 1)).trimEnd()}...`;
}
