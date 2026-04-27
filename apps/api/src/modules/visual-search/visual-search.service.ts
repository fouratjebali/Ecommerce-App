import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ProductStatus } from '@prisma/client';
import type { AppEnvironment } from '../../config/environment';
import { PrismaService } from '../prisma/prisma.service';
import {
  VISUAL_SEARCH_EMBEDDING_TABLE,
  VISUAL_SEARCH_FEATURE_VERSION,
} from './visual-search.constants';
import {
  VisualSearchQueryDto,
  VisualSearchRecommendationsQueryDto,
} from './dto/visual-search-query.dto';
import {
  buildEnsureVisualSearchStorageStatements,
  toVectorLiteral,
} from './visual-search.sql';
import { VisualFeatureExtractorService } from './visual-feature-extractor.service';
import { VisualSearchCacheService } from './visual-search-cache.service';
import type {
  VisualEmbedding,
  VisualSearchFilters,
  VisualSearchIndexInput,
} from './visual-search.types';

const visualSearchProductInclude = {
  artisan: true,
  category: true,
  ecoRating: true,
  materials: {
    include: {
      materialTag: true,
    },
  },
  images: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  attributes: {
    include: {
      definition: true,
      option: true,
    },
  },
} satisfies Prisma.ProductInclude;

type VisualSearchProductRecord = Prisma.ProductGetPayload<{
  include: typeof visualSearchProductInclude;
}>;

type RawVectorMatchRow = {
  productId: string;
  similarity: number;
  sourceStrategy: string;
};

interface RankedVisualMatch {
  productId: string;
  similarity: number | null;
  hybridScore: number | null;
  sourceStrategy: string;
  isFallback: boolean;
  matchReasons: string[];
}

interface RankedVisualSearchItem {
  product: VisualSearchProductRecord;
  match: RankedVisualMatch;
}

@Injectable()
export class VisualSearchService {
  private readonly logger = new Logger(VisualSearchService.name);
  private storagePrepared = false;
  private initialSyncComplete = false;
  private syncPromise: Promise<void> | null = null;
  private readonly embeddingRegistry = new Map<
    string,
    {
      vector: number[];
      dominantColorHex: string;
      sourceStrategy: string;
      categorySlug: string;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppEnvironment>,
    private readonly visualSearchCacheService: VisualSearchCacheService,
    private readonly visualFeatureExtractorService: VisualFeatureExtractorService,
  ) {}

  async searchByImage(
    file: Express.Multer.File | undefined,
    query: VisualSearchQueryDto,
  ) {
    this.ensureImageFile(file);
    await this.ensureCatalogIndex();

    const queryEmbedding =
      await this.visualFeatureExtractorService.extractFromBuffer(file.buffer);
    const matches = await this.runVectorSearch(queryEmbedding.vector, query);

    if (!matches.length) {
      return this.buildFallbackResponse(
        query,
        queryEmbedding,
        matches[0]?.similarity ?? null,
      );
    }

    const products = await this.loadProductsByIds(
      matches.map((match) => match.productId),
    );
    const rankedMatches = this.rankMatches(products, matches, query);
    const relevantMatches = this.selectRelevantMatches(rankedMatches, query);

    if (!relevantMatches.length) {
      return this.buildFallbackResponse(
        query,
        queryEmbedding,
        matches[0]?.similarity ?? null,
      );
    }

    return {
      query: {
        dominantColorHex: queryEmbedding.dominantColorHex,
        filtersApplied: this.mapFiltersApplied(query),
        fallbackMode: null,
      },
      items: relevantMatches.map(({ product, match }) =>
        this.mapVisualSearchProduct(product, match),
      ),
    };
  }

  async getRecommendationsByProductSlug(
    slug: string,
    query: VisualSearchRecommendationsQueryDto,
  ) {
    await this.ensureCatalogIndex();

    const basisProduct = await this.prisma.product.findUnique({
      where: { slug },
      include: visualSearchProductInclude,
    });

    if (!basisProduct || basisProduct.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException(
        'Les recommandations de recherche visuelle sont introuvables pour ce produit.',
      );
    }

    const cachedIds =
      (await this.visualSearchCacheService.getSimilarProductIds(
        basisProduct.id,
      )) ?? [];
    const productIds = cachedIds.slice(0, this.resolveLimit(query.limit));
    const products = await this.loadProductsByIds(productIds);

    return {
      basisProduct: {
        id: basisProduct.id,
        slug: basisProduct.slug,
        name: basisProduct.name,
      },
      items: products.map((product, index) =>
        this.mapVisualSearchProduct(product, {
          productId: product.id,
          similarity: null,
          hybridScore: null,
          sourceStrategy: 'redis-cache',
          isFallback: true,
          matchReasons: [
            index === 0
              ? 'Top cached visual neighbor for this product.'
              : 'Served from the Redis-backed visually similar products cache.',
          ],
        }),
      ),
    };
  }

  async syncPublishedCatalogIndex() {
    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.performCatalogSync().finally(() => {
      this.syncPromise = null;
    });

    return this.syncPromise;
  }

  async handleProductUpserted() {
    try {
      await this.syncPublishedCatalogIndex();
    } catch (error) {
      this.logger.warn(
        `Visual-search index refresh failed after a product update: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async performCatalogSync() {
    await this.ensureStorage();

    const publishedProducts = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
      },
      include: visualSearchProductInclude,
      orderBy: [
        { isFeatured: 'desc' },
        { impactScore: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const indexedProducts = await Promise.all(
      publishedProducts.map(async (product) => {
        const embeddingInput = this.toEmbeddingInput(product);
        const embedding =
          await this.visualFeatureExtractorService.extractFromProduct(
            embeddingInput,
          );

        await this.upsertEmbedding(product, embedding);

        return {
          product,
          embedding,
        };
      }),
    );

    this.embeddingRegistry.clear();

    for (const entry of indexedProducts) {
      this.embeddingRegistry.set(entry.product.id, {
        vector: entry.embedding.vector,
        dominantColorHex: entry.embedding.dominantColorHex,
        sourceStrategy: entry.embedding.source,
        categorySlug: entry.product.category.slug,
      });
    }

    await this.deleteOrphanedEmbeddings(
      publishedProducts.map((product) => product.id),
    );
    await this.refreshRecommendationCache(
      indexedProducts.map((entry) => entry.product),
    );

    this.initialSyncComplete = true;
  }

  private async ensureCatalogIndex() {
    if (this.initialSyncComplete) {
      return;
    }

    await this.syncPublishedCatalogIndex();
  }

  private async ensureStorage() {
    if (this.storagePrepared) {
      return;
    }

    const vectorDimensions = this.configService.get(
      'VISUAL_SEARCH_VECTOR_DIMENSIONS',
      {
        infer: true,
      },
    )!;
    const statements =
      buildEnsureVisualSearchStorageStatements(vectorDimensions);

    for (const statement of statements) {
      await this.prisma.$executeRawUnsafe(statement);
    }

    this.storagePrepared = true;
  }

  private async upsertEmbedding(
    product: VisualSearchProductRecord,
    embedding: VisualEmbedding,
  ) {
    const vectorLiteral = toVectorLiteral(embedding.vector);
    const imageUrl = product.images[0]?.url ?? null;
    const safeImageUrl = imageUrl ? `'${quoteLiteral(imageUrl)}'` : 'NULL';

    await this.prisma.$executeRawUnsafe(`
      INSERT INTO ${VISUAL_SEARCH_EMBEDDING_TABLE} (
        "productId",
        "embedding",
        "embeddingVersion",
        "sourceStrategy",
        "imageUrl",
        "dominantColorHex",
        "indexedAt",
        "updatedAt"
      )
      VALUES (
        '${quoteLiteral(product.id)}',
        '${vectorLiteral}'::vector,
        '${quoteLiteral(VISUAL_SEARCH_FEATURE_VERSION)}',
        '${quoteLiteral(embedding.source)}',
        ${safeImageUrl},
        '${quoteLiteral(embedding.dominantColorHex)}',
        NOW(),
        NOW()
      )
      ON CONFLICT ("productId") DO UPDATE SET
        "embedding" = EXCLUDED."embedding",
        "embeddingVersion" = EXCLUDED."embeddingVersion",
        "sourceStrategy" = EXCLUDED."sourceStrategy",
        "imageUrl" = EXCLUDED."imageUrl",
        "dominantColorHex" = EXCLUDED."dominantColorHex",
        "indexedAt" = NOW(),
        "updatedAt" = NOW();
    `);
  }

  private async deleteOrphanedEmbeddings(activeProductIds: string[]) {
    if (!activeProductIds.length) {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM ${VISUAL_SEARCH_EMBEDDING_TABLE};`,
      );
      return;
    }

    const productIdList = activeProductIds
      .map((productId) => `'${quoteLiteral(productId)}'`)
      .join(', ');

    await this.prisma.$executeRawUnsafe(`
      DELETE FROM ${VISUAL_SEARCH_EMBEDDING_TABLE}
      WHERE "productId" NOT IN (${productIdList});
    `);
  }

  private async runVectorSearch(vector: number[], query: VisualSearchQueryDto) {
    await this.ensureStorage();

    const limit = this.resolveLimit(query.limit);
    const vectorLiteral = Prisma.raw(`'${toVectorLiteral(vector)}'::vector`);
    const filters: Prisma.Sql[] = [
      Prisma.sql`p."status" = CAST(${ProductStatus.PUBLISHED} AS "ProductStatus")`,
    ];

    if (query.category?.length) {
      filters.push(Prisma.sql`c."slug" IN (${Prisma.join(query.category)})`);
    }

    if (query.ecoRating?.length) {
      filters.push(Prisma.sql`er."code" IN (${Prisma.join(query.ecoRating)})`);
    }

    if (query.artisan?.length) {
      filters.push(Prisma.sql`a."slug" IN (${Prisma.join(query.artisan)})`);
    }

    if (query.minImpactScore !== undefined) {
      filters.push(Prisma.sql`p."impactScore" >= ${query.minImpactScore}`);
    }

    if (query.maxPrice !== undefined) {
      filters.push(Prisma.sql`p."priceInCents" <= ${query.maxPrice}`);
    }

    if (query.material?.length) {
      filters.push(Prisma.sql`
        EXISTS (
          SELECT 1
          FROM "ProductMaterial" pm
          INNER JOIN "MaterialTag" mt ON mt."id" = pm."materialTagId"
          WHERE pm."productId" = p."id"
            AND mt."slug" IN (${Prisma.join(query.material)})
        )
      `);
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;
    const tableName = Prisma.raw(VISUAL_SEARCH_EMBEDDING_TABLE);

    return this.prisma.$queryRaw<RawVectorMatchRow[]>(Prisma.sql`
      SELECT
        p."id" AS "productId",
        1 - (vs."embedding" <=> ${vectorLiteral}) AS "similarity",
        vs."sourceStrategy" AS "sourceStrategy"
      FROM ${tableName} vs
      INNER JOIN "Product" p ON p."id" = vs."productId"
      INNER JOIN "Category" c ON c."id" = p."categoryId"
      INNER JOIN "EcoRating" er ON er."id" = p."ecoRatingId"
      INNER JOIN "ArtisanProfile" a ON a."id" = p."artisanId"
      ${whereClause}
      ORDER BY vs."embedding" <=> ${vectorLiteral} ASC, p."impactScore" DESC, p."isFeatured" DESC
      LIMIT ${limit};
    `);
  }

  private async buildFallbackResponse(
    query: VisualSearchQueryDto,
    queryEmbedding: VisualEmbedding,
    peakSimilarity: number | null,
  ) {
    const productIds = await this.resolveFallbackProductIds(query);
    const products = await this.loadProductsByIds(productIds);

    return {
      query: {
        dominantColorHex: queryEmbedding.dominantColorHex,
        filtersApplied: this.mapFiltersApplied(query),
        fallbackMode: 'redis-cold-start',
        peakSimilarity,
      },
      items: products.map((product) =>
        this.mapVisualSearchProduct(product, {
          productId: product.id,
          similarity: null,
          hybridScore: null,
          sourceStrategy: 'redis-cache',
          isFallback: true,
          matchReasons: buildFallbackReasons(product, query),
        }),
      ),
    };
  }

  private async resolveFallbackProductIds(query: VisualSearchQueryDto) {
    for (const categorySlug of query.category ?? []) {
      const cachedIds =
        await this.visualSearchCacheService.getCategoryFallbackIds(
          categorySlug,
        );

      if (cachedIds?.length) {
        return cachedIds.slice(0, this.resolveLimit(query.limit));
      }
    }

    const discoveryIds =
      await this.visualSearchCacheService.getDiscoveryFallbackIds();
    return (discoveryIds ?? []).slice(0, this.resolveLimit(query.limit));
  }

  private async refreshRecommendationCache(
    products: VisualSearchProductRecord[],
  ) {
    const cachedProducts = products.filter((product) =>
      this.embeddingRegistry.has(product.id),
    );
    const defaultFallbackIds = cachedProducts
      .slice(0, this.resolveLimit(undefined))
      .map((product) => product.id);

    await this.visualSearchCacheService.setDiscoveryFallbackIds(
      defaultFallbackIds,
    );

    const categoryGroups = new Map<string, string[]>();

    for (const product of cachedProducts) {
      const currentCategoryIds =
        categoryGroups.get(product.category.slug) ?? [];
      currentCategoryIds.push(product.id);
      categoryGroups.set(product.category.slug, currentCategoryIds);

      const baseEmbedding = this.embeddingRegistry.get(product.id)?.vector;

      if (!baseEmbedding) {
        continue;
      }

      const nearestIds = cachedProducts
        .filter((candidate) => candidate.id !== product.id)
        .map((candidate) => ({
          productId: candidate.id,
          similarity: cosineSimilarity(
            baseEmbedding,
            this.embeddingRegistry.get(candidate.id)?.vector ?? [],
          ),
          impactScore: candidate.impactScore,
        }))
        .sort((left, right) => {
          if (right.similarity !== left.similarity) {
            return right.similarity - left.similarity;
          }

          return right.impactScore - left.impactScore;
        })
        .slice(0, 6)
        .map((candidate) => candidate.productId);

      await this.visualSearchCacheService.setSimilarProductIds(
        product.id,
        nearestIds,
      );
    }

    for (const [categorySlug, productIds] of categoryGroups.entries()) {
      await this.visualSearchCacheService.setCategoryFallbackIds(
        categorySlug,
        productIds.slice(0, this.resolveLimit(undefined)),
      );
    }
  }

  private async loadProductsByIds(productIds: string[]) {
    if (!productIds.length) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        status: ProductStatus.PUBLISHED,
      },
      include: visualSearchProductInclude,
    });
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    return productIds
      .map((productId) => productMap.get(productId))
      .filter((product): product is VisualSearchProductRecord =>
        Boolean(product),
      );
  }

  private rankMatches(
    products: VisualSearchProductRecord[],
    matches: RawVectorMatchRow[],
    query: VisualSearchFilters,
  ): RankedVisualSearchItem[] {
    const matchMap = new Map(matches.map((match) => [match.productId, match]));

    return products
      .map((product) => {
        const match = matchMap.get(product.id)!;
        const hybridScore = this.calculateHybridScore(
          product,
          match.similarity,
          query,
        );

        return {
          product,
          match: {
            productId: product.id,
            similarity: Number(match.similarity.toFixed(4)),
            hybridScore,
            sourceStrategy: match.sourceStrategy,
            isFallback: false,
            matchReasons: buildMatchReasons(product, match.similarity, query),
          },
        };
      })
      .sort((left, right) => {
        if ((right.match.hybridScore ?? 0) !== (left.match.hybridScore ?? 0)) {
          return (right.match.hybridScore ?? 0) - (left.match.hybridScore ?? 0);
        }

        return (right.match.similarity ?? 0) - (left.match.similarity ?? 0);
      });
  }

  private selectRelevantMatches(
    rankedMatches: RankedVisualSearchItem[],
    query: VisualSearchFilters,
  ) {
    const topSimilarity = rankedMatches[0]?.match.similarity ?? 0;

    if (topSimilarity < 0.18) {
      return [];
    }

    const similarityFloor = Math.max(
      0.22,
      topSimilarity - (topSimilarity >= 0.85 ? 0.08 : 0.14),
    );
    const maxResults = Math.min(this.resolveLimit(query.limit), 3);

    return rankedMatches
      .filter(({ match }, index) => {
        if (index === 0) {
          return true;
        }

        return (match.similarity ?? 0) >= similarityFloor;
      })
      .slice(0, maxResults);
  }

  private calculateHybridScore(
    product: VisualSearchProductRecord,
    similarity: number,
    query: VisualSearchFilters,
  ) {
    let score =
      similarity * 0.82 +
      (product.impactScore / 100) * 0.12 +
      (product.ecoRating.score / 100) * 0.06;

    if (query.category?.includes(product.category.slug)) {
      score += 0.03;
    }

    if (
      query.material?.some((materialSlug) =>
        product.materials.some(
          (material) => material.materialTag.slug === materialSlug,
        ),
      )
    ) {
      score += 0.04;
    }

    return Number(Math.min(score, 0.9999).toFixed(4));
  }

  private mapVisualSearchProduct(
    product: VisualSearchProductRecord,
    match: RankedVisualMatch,
  ) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      artisan: {
        slug: product.artisan.slug,
        studioName: product.artisan.studioName,
        location: product.artisan.location,
      },
      category: {
        slug: product.category.slug,
        name: product.category.name,
      },
      ecoRating: {
        code: product.ecoRating.code,
        label: product.ecoRating.label,
        score: product.ecoRating.score,
      },
      materials: product.materials.map((material) => ({
        id: material.materialTag.id,
        slug: material.materialTag.slug,
        name: material.materialTag.name,
      })),
      imageUrl: product.images[0]?.url ?? null,
      imageAlt: product.images[0]?.alt ?? product.name,
      price: {
        amountInCents: product.priceInCents,
        currency: product.currency,
      },
      impactScore: product.impactScore,
      co2SavedKg: product.co2SavedKg,
      leadTimeDays: product.leadTimeDays,
      isFeatured: product.isFeatured,
      visualMatch: {
        similarity: match.similarity,
        hybridScore: match.hybridScore,
        sourceStrategy: match.sourceStrategy,
        isFallback: match.isFallback,
        matchReasons: match.matchReasons,
      },
    };
  }

  private toEmbeddingInput(
    product: VisualSearchProductRecord,
  ): VisualSearchIndexInput {
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.images[0]?.url ?? null,
      categorySlug: product.category.slug,
      ecoRatingCode: product.ecoRating.code,
      artisanSlug: product.artisan.slug,
      colorFamily:
        product.attributes.find(
          (attribute) => attribute.definition.code === 'color-family',
        )?.option?.value ?? null,
      materialNames: product.materials.map(
        (material) => material.materialTag.name,
      ),
    };
  }

  private resolveLimit(limit: number | undefined) {
    return (
      limit ??
      this.configService.get('VISUAL_SEARCH_DEFAULT_LIMIT', {
        infer: true,
      })!
    );
  }

  private mapFiltersApplied(query: VisualSearchFilters) {
    return {
      category: query.category ?? [],
      material: query.material ?? [],
      ecoRating: query.ecoRating ?? [],
      artisan: query.artisan ?? [],
      minImpactScore: query.minImpactScore ?? null,
      maxPrice: query.maxPrice ?? null,
      limit: this.resolveLimit(query.limit),
    };
  }

  private ensureImageFile(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Televersez une image pour lancer la recherche visuelle.');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'La recherche visuelle accepte uniquement les fichiers image.',
      );
    }
  }
}

function quoteLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || !right.length || left.length !== right.length) {
    return 0;
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index]! * right[index]!;
    leftMagnitude += left[index]! * left[index]!;
    rightMagnitude += right[index]! * right[index]!;
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function buildMatchReasons(
  product: VisualSearchProductRecord,
  similarity: number,
  query: VisualSearchFilters,
) {
  const reasons = [
    similarity >= 0.88
      ? "Tres forte similarite visuelle avec l'inspiration televersee."
      : similarity >= 0.72
        ? 'Forte similarite visuelle avec la photo de reference.'
        : "Alternative artisanale la plus proche trouvee dans l'index visuel actuel.",
  ];

  if (query.category?.includes(product.category.slug)) {
    reasons.push(`Correspond a la categorie ${product.category.name}.`);
  }

  if (
    query.material?.some((materialSlug) =>
      product.materials.some(
        (material) => material.materialTag.slug === materialSlug,
      ),
    )
  ) {
    reasons.push('Correspond aux filtres matiere selectionnes.');
  }

  if (product.impactScore >= 90) {
    reasons.push(`Score d'impact eleve : ${product.impactScore}/100.`);
  }

  return reasons.slice(0, 3);
}

function buildFallbackReasons(
  product: VisualSearchProductRecord,
  query: VisualSearchFilters,
) {
  const reasons = [
    'Resultat issu du cache de decouverte visuelle pour un demarrage a froid securise.',
  ];

  if (query.category?.includes(product.category.slug)) {
    reasons.push(
      `Recupere depuis le jeu de secours en cache pour ${product.category.name}.`,
    );
  }

  reasons.push(
    `Signal de durabilite fort dans la marketplace : ${product.impactScore}/100.`,
  );

  return reasons.slice(0, 3);
}
