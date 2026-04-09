import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus, VendorStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ArtisansService {
  constructor(private readonly prisma: PrismaService) {}

  async listArtisans() {
    const artisans = await this.prisma.artisanProfile.findMany({
      where: {
        verificationStatus: VendorStatus.ACTIVE,
      },
      include: {
        user: true,
        products: {
          where: {
            status: ProductStatus.PUBLISHED,
          },
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ verified: 'desc' }, { totalSales: 'desc' }],
    });

    return artisans.map((artisan) => this.mapPublicArtisan(artisan));
  }

  async getFeatured() {
    const artisans = await this.prisma.artisanProfile.findMany({
      where: {
        verificationStatus: VendorStatus.ACTIVE,
      },
      include: {
        user: true,
        products: {
          where: {
            status: ProductStatus.PUBLISHED,
          },
          include: {
            category: true,
          },
        },
      },
      orderBy: [{ verified: 'desc' }, { totalSales: 'desc' }],
      take: 3,
    });

    return artisans.map((artisan) => this.mapPublicArtisan(artisan));
  }

  async getBySlug(slug: string) {
    const artisan = await this.prisma.artisanProfile.findUnique({
      where: { slug },
      include: {
        user: true,
        products: {
          where: {
            status: ProductStatus.PUBLISHED,
          },
          include: {
            category: true,
            materials: {
              include: {
                materialTag: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    if (!artisan) {
      throw new NotFoundException('Artisan not found.');
    }

    return {
      artisan: {
        ...this.mapPublicArtisan(artisan),
        products: artisan.products.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          shortDescription: product.shortDescription,
          category: product.category.name,
          impactScore: product.impactScore,
          materials: product.materials.map((material) => material.materialTag.name),
        })),
      },
    };
  }

  private mapPublicArtisan(artisan: {
    id: string;
    slug: string;
    studioName: string;
    headline: string;
    bio: string;
    location: string;
    impactStatement: string;
    verified: boolean;
    verificationStatus: VendorStatus;
    user: { fullName: string };
    products: { category: { name: string } }[];
  }) {
    return {
      id: artisan.id,
      slug: artisan.slug,
      name: artisan.user.fullName,
      studio: artisan.studioName,
      location: artisan.location,
      specialty:
        artisan.products[0]?.category.name ?? artisan.headline,
      impactBadge: artisan.verified
        ? 'Verified sustainable studio'
        : artisan.verificationStatus,
      story: artisan.impactStatement,
      headline: artisan.headline,
      verified: artisan.verified,
      productCount: artisan.products.length,
    };
  }
}
