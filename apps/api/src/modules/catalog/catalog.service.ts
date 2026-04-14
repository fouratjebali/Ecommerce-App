import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, ProductStatus } from '@prisma/client';
import { storefrontSnapshot } from '../storefront/storefront.data';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { VISUAL_SEARCH_PRODUCT_UPSERTED_EVENT } from '../visual-search/visual-search.constants';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { UpsertProductDto } from './dto/upsert-product.dto';

const publicCatalogInclude = {
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

type CatalogProductRecord = Prisma.ProductGetPayload<{
  include: typeof publicCatalogInclude;
}>;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getHighlights() {
    const [featuredProducts, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          status: ProductStatus.PUBLISHED,
          isFeatured: true,
        },
        include: publicCatalogInclude,
        orderBy: [{ impactScore: 'desc' }, { createdAt: 'desc' }],
        take: 3,
      }),
      this.buildStorefrontCategories(),
    ]);

    return {
      categories,
      featuredProducts: featuredProducts.map((product) =>
        this.mapStorefrontProduct(product),
      ),
    };
  }

  async getPublicCatalog(query: CatalogQueryDto) {
    const products = await this.prisma.product.findMany({
      where: this.buildPublicWhere(query),
      include: publicCatalogInclude,
      orderBy: this.resolvePublicSort(query.sort),
    });

    return {
      items: products.map((product) => this.mapPublicCatalogProduct(product)),
      total: products.length,
      filtersApplied: {
        q: query.q ?? null,
        category: query.category ?? [],
        material: query.material ?? [],
        ecoRating: query.ecoRating ?? [],
        artisan: query.artisan ?? [],
        madeToOrder: query.madeToOrder ?? null,
        minImpactScore: query.minImpactScore ?? null,
        minPrice: query.minPrice ?? null,
        maxPrice: query.maxPrice ?? null,
        sort: query.sort ?? 'featured',
      },
    };
  }

  async getCatalogFacets() {
    const [products, definitions] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          status: ProductStatus.PUBLISHED,
        },
        include: publicCatalogInclude,
      }),
      this.prisma.productAttributeDefinition.findMany({
        include: {
          options: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      }),
    ]);

    const countByKey = (values: string[]): Record<string, number> =>
      values.reduce<Record<string, number>>((acc, value) => {
        acc[value] = (acc[value] ?? 0) + 1;
        return acc;
      }, {});

    const categoryCounts = countByKey(
      products.map((product) => product.category.slug),
    );
    const ecoCounts = countByKey(
      products.map((product) => product.ecoRating.code),
    );
    const artisanCounts = countByKey(
      products.map((product) => product.artisan.slug),
    );
    const materialCounts = countByKey(
      products.flatMap((product) =>
        product.materials.map((material) => material.materialTag.slug),
      ),
    );

    return {
      categories: Object.entries(categoryCounts).map(([slug, count]) => {
        const category = products.find(
          (product) => product.category.slug === slug,
        )?.category;

        return {
          slug,
          name: category?.name ?? slug,
          count,
        };
      }),
      ecoRatings: Object.entries(ecoCounts).map(([code, count]) => {
        const ecoRating = products.find(
          (product) => product.ecoRating.code === code,
        )?.ecoRating;

        return {
          code,
          label: ecoRating?.label ?? code,
          score: ecoRating?.score ?? 0,
          count,
        };
      }),
      artisans: Object.entries(artisanCounts).map(([slug, count]) => {
        const artisan = products.find(
          (product) => product.artisan.slug === slug,
        )?.artisan;

        return {
          slug,
          studioName: artisan?.studioName ?? slug,
          count,
        };
      }),
      materials: Object.entries(materialCounts).map(([slug, count]) => {
        const material = products
          .flatMap((product) => product.materials)
          .find((entry) => entry.materialTag.slug === slug)?.materialTag;

        return {
          slug,
          name: material?.name ?? slug,
          count,
        };
      }),
      attributes: definitions.map((definition) => ({
        id: definition.id,
        code: definition.code,
        label: definition.label,
        kind: definition.kind,
        filterGroup: definition.filterGroup,
        options: definition.options.map((option) => ({
          id: option.id,
          value: option.value,
          label: option.label,
          count: products.filter((product) =>
            product.attributes.some(
              (attribute) =>
                attribute.definitionId === definition.id &&
                attribute.optionId === option.id,
            ),
          ).length,
        })),
      })),
    };
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: publicCatalogInclude,
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('Product not found.');
    }

    return {
      product: this.mapDetailedProduct(product),
    };
  }

  async getVendorAttributeOptions() {
    const [categories, ecoRatings, materials, definitions] = await Promise.all([
      this.prisma.category.findMany({
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.ecoRating.findMany({
        orderBy: {
          score: 'desc',
        },
      }),
      this.prisma.materialTag.findMany({
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.productAttributeDefinition.findMany({
        include: {
          options: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      }),
    ]);

    return {
      categories,
      ecoRatings,
      materials,
      attributeDefinitions: definitions,
      productStatuses: Object.values(ProductStatus),
    };
  }

  async getVendorProducts(user: AuthenticatedUser) {
    const artisanId = this.requireArtisanProfile(user);
    const products = await this.prisma.product.findMany({
      where: {
        artisanId,
      },
      include: publicCatalogInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      items: products.map((product) => this.mapVendorProduct(product)),
    };
  }

  async createVendorProduct(user: AuthenticatedUser, dto: UpsertProductDto) {
    const artisanId = this.requireArtisanProfile(user);
    await this.ensureProductReferences(dto);
    await this.ensureSlugAvailable(dto.slug);

    const product = await this.prisma.product.create({
      data: {
        artisanId,
        slug: dto.slug,
        name: dto.name,
        shortDescription: dto.shortDescription,
        description: dto.description,
        story: dto.story,
        categoryId: dto.categoryId,
        ecoRatingId: dto.ecoRatingId,
        currency: dto.currency ?? 'TND',
        priceInCents: dto.priceInCents,
        inventoryCount: dto.inventoryCount,
        impactScore: dto.impactScore,
        co2SavedKg: dto.co2SavedKg,
        leadTimeDays: dto.leadTimeDays,
        status: dto.status,
        isFeatured: dto.isFeatured,
        images: {
          create: [
            {
              url: dto.imageUrl,
              alt: dto.imageAlt,
            },
          ],
        },
        materials: {
          create: dto.materialIds.map((materialTagId) => ({
            materialTagId,
          })),
        },
        attributes: {
          create:
            dto.attributeValues?.map((attribute) => ({
              definitionId: attribute.definitionId,
              optionId: attribute.optionId,
              valueText: attribute.valueText,
              valueNumber: attribute.valueNumber,
              valueBoolean: attribute.valueBoolean,
            })) ?? [],
        },
      },
      include: publicCatalogInclude,
    });

    this.eventEmitter.emit(VISUAL_SEARCH_PRODUCT_UPSERTED_EVENT, {
      productId: product.id,
    });

    return {
      product: this.mapVendorProduct(product),
    };
  }

  async updateVendorProduct(
    user: AuthenticatedUser,
    productId: string,
    dto: UpsertProductDto,
  ) {
    const artisanId = this.requireArtisanProfile(user);
    const existingProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        artisanId: true,
      },
    });

    if (!existingProduct || existingProduct.artisanId !== artisanId) {
      throw new NotFoundException('Product not found for this artisan.');
    }

    await this.ensureProductReferences(dto);
    await this.ensureSlugAvailable(dto.slug, productId);

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        slug: dto.slug,
        name: dto.name,
        shortDescription: dto.shortDescription,
        description: dto.description,
        story: dto.story,
        categoryId: dto.categoryId,
        ecoRatingId: dto.ecoRatingId,
        currency: dto.currency ?? 'TND',
        priceInCents: dto.priceInCents,
        inventoryCount: dto.inventoryCount,
        impactScore: dto.impactScore,
        co2SavedKg: dto.co2SavedKg,
        leadTimeDays: dto.leadTimeDays,
        status: dto.status,
        isFeatured: dto.isFeatured,
        images: {
          deleteMany: {},
          create: [
            {
              url: dto.imageUrl,
              alt: dto.imageAlt,
            },
          ],
        },
        materials: {
          deleteMany: {},
          create: dto.materialIds.map((materialTagId) => ({
            materialTagId,
          })),
        },
        attributes: {
          deleteMany: {},
          create:
            dto.attributeValues?.map((attribute) => ({
              definitionId: attribute.definitionId,
              optionId: attribute.optionId,
              valueText: attribute.valueText,
              valueNumber: attribute.valueNumber,
              valueBoolean: attribute.valueBoolean,
            })) ?? [],
        },
      },
      include: publicCatalogInclude,
    });

    this.eventEmitter.emit(VISUAL_SEARCH_PRODUCT_UPSERTED_EVENT, {
      productId: product.id,
    });

    return {
      product: this.mapVendorProduct(product),
    };
  }

  private async buildStorefrontCategories() {
    const categories = await this.prisma.category.findMany({
      include: {
        products: {
          where: {
            status: ProductStatus.PUBLISHED,
          },
          include: {
            materials: {
              include: {
                materialTag: true,
              },
            },
          },
        },
      },
    });

    return categories
      .filter((category) => category.products.length > 0)
      .slice(0, 3)
      .map((category) => {
        const materialNames = [
          ...new Set(
            category.products.flatMap((product) =>
              product.materials.map((material) => material.materialTag.name),
            ),
          ),
        ].slice(0, 2);

        const avgImpactScore = Math.round(
          category.products.reduce(
            (sum, product) => sum + product.impactScore,
            0,
          ) / category.products.length,
        );

        return {
          slug: category.slug,
          name: category.name,
          description: category.description,
          materialFocus: materialNames.join(', '),
          impactHighlight: `Average impact score ${avgImpactScore}/100 across published pieces`,
        };
      });
  }

  private buildPublicWhere(query: CatalogQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.PUBLISHED,
    };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { shortDescription: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { story: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.category?.length) {
      where.category = {
        slug: { in: query.category },
      };
    }

    if (query.material?.length) {
      where.materials = {
        some: {
          materialTag: {
            slug: { in: query.material },
          },
        },
      };
    }

    if (query.ecoRating?.length) {
      where.ecoRating = {
        code: { in: query.ecoRating },
      };
    }

    if (query.artisan?.length) {
      where.artisan = {
        slug: { in: query.artisan },
      };
    }

    if (query.minImpactScore !== undefined) {
      where.impactScore = {
        gte: query.minImpactScore,
      };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.priceInCents = {
        gte: query.minPrice,
        lte: query.maxPrice,
      };
    }

    if (query.madeToOrder !== undefined) {
      where.attributes = {
        some: {
          definition: {
            code: 'made-to-order',
          },
          valueBoolean: query.madeToOrder,
        },
      };
    }

    return where;
  }

  private resolvePublicSort(sort: CatalogQueryDto['sort']) {
    switch (sort) {
      case 'price-asc':
        return [
          { priceInCents: 'asc' as const },
          { createdAt: 'desc' as const },
        ];
      case 'price-desc':
        return [
          { priceInCents: 'desc' as const },
          { createdAt: 'desc' as const },
        ];
      case 'impact-desc':
        return [
          { impactScore: 'desc' as const },
          { createdAt: 'desc' as const },
        ];
      case 'newest':
        return [{ createdAt: 'desc' as const }];
      case 'featured':
      default:
        return [
          { isFeatured: 'desc' as const },
          { impactScore: 'desc' as const },
          { createdAt: 'desc' as const },
        ];
    }
  }

  private mapStorefrontProduct(product: CatalogProductRecord) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      artisanName: product.artisan.studioName,
      region: product.artisan.location,
      material: product.materials[0]?.materialTag.name ?? 'Mixed materials',
      price: product.priceInCents / 100,
      currency: product.currency,
      co2SavedKg: product.co2SavedKg,
      impactScore: product.impactScore,
      storySnippet: product.story,
      imageHint: product.images[0]?.alt ?? product.shortDescription,
    };
  }

  private mapPublicCatalogProduct(product: CatalogProductRecord) {
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
    };
  }

  private mapDetailedProduct(product: CatalogProductRecord) {
    return {
      ...this.mapPublicCatalogProduct(product),
      description: product.description,
      story: product.story,
      inventoryCount: product.inventoryCount,
      attributes: product.attributes.map((attribute) => ({
        id: attribute.id,
        code: attribute.definition.code,
        label: attribute.definition.label,
        value:
          attribute.option?.label ??
          attribute.valueText ??
          attribute.valueNumber ??
          attribute.valueBoolean,
      })),
    };
  }

  private mapVendorProduct(product: CatalogProductRecord) {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      status: product.status,
      categoryId: product.categoryId,
      ecoRatingId: product.ecoRatingId,
      shortDescription: product.shortDescription,
      description: product.description,
      story: product.story,
      currency: product.currency,
      priceInCents: product.priceInCents,
      inventoryCount: product.inventoryCount,
      impactScore: product.impactScore,
      co2SavedKg: product.co2SavedKg,
      leadTimeDays: product.leadTimeDays,
      isFeatured: product.isFeatured,
      imageUrl: product.images[0]?.url ?? '',
      imageAlt: product.images[0]?.alt ?? product.name,
      materialIds: product.materials.map((material) => material.materialTagId),
      attributeValues: product.attributes.map((attribute) => ({
        definitionId: attribute.definitionId,
        optionId: attribute.optionId,
        valueText: attribute.valueText,
        valueNumber: attribute.valueNumber,
        valueBoolean: attribute.valueBoolean,
      })),
      updatedAt: product.updatedAt,
    };
  }

  private requireArtisanProfile(user: AuthenticatedUser) {
    if (!user.artisanProfileId) {
      throw new ForbiddenException('This action requires an artisan account.');
    }

    return user.artisanProfileId;
  }

  private async ensureProductReferences(dto: UpsertProductDto) {
    const [category, ecoRating, materials, slugConflict] = await Promise.all([
      this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      }),
      this.prisma.ecoRating.findUnique({
        where: { id: dto.ecoRatingId },
        select: { id: true },
      }),
      this.prisma.materialTag.findMany({
        where: {
          id: {
            in: dto.materialIds,
          },
        },
        select: { id: true },
      }),
      dto.attributeValues?.length
        ? this.prisma.productAttributeDefinition.findMany({
            where: {
              id: {
                in: dto.attributeValues.map(
                  (attribute) => attribute.definitionId,
                ),
              },
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    if (!category || !ecoRating) {
      throw new BadRequestException(
        'Invalid category or eco rating reference.',
      );
    }

    if (materials.length !== dto.materialIds.length) {
      throw new BadRequestException('One or more materials were not found.');
    }

    if (
      dto.attributeValues?.length &&
      slugConflict.length !== dto.attributeValues.length
    ) {
      throw new BadRequestException(
        'One or more product attribute definitions were not found.',
      );
    }
  }

  private async ensureSlugAvailable(slug: string, currentProductId?: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingProduct && existingProduct.id !== currentProductId) {
      throw new ConflictException('A product with this slug already exists.');
    }
  }
}
