import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UpdateVendorProfileDto } from './dto/update-vendor-profile.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnProfile(user: AuthenticatedUser) {
    const profile = await this.requireArtisanProfile(user);

    return {
      profile: this.mapProfile(profile),
    };
  }

  async updateOwnProfile(
    user: AuthenticatedUser,
    dto: UpdateVendorProfileDto,
  ) {
    await this.requireArtisanProfile(user);

    const profile = await this.prisma.artisanProfile.update({
      where: { id: user.artisanProfileId! },
      data: dto,
    });

    return {
      profile: this.mapProfile(profile),
    };
  }

  async getDashboard(user: AuthenticatedUser) {
    const profile = await this.requireArtisanProfile(user);
    const products = await this.prisma.product.findMany({
      where: { artisanId: profile.id },
      include: {
        materials: {
          include: {
            materialTag: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const totalInventory = products.reduce(
      (sum, product) => sum + product.inventoryCount,
      0,
    );
    const avgImpactScore =
      products.length > 0
        ? Math.round(
            products.reduce((sum, product) => sum + product.impactScore, 0) /
              products.length,
          )
        : 0;
    const totalCo2Saved = products.reduce(
      (sum, product) => sum + product.co2SavedKg,
      0,
    );
    const materialCounts = products
      .flatMap((product) =>
        product.materials.map((material) => material.materialTag.name),
      )
      .reduce<Record<string, number>>((acc, materialName) => {
        acc[materialName] = (acc[materialName] ?? 0) + 1;
        return acc;
      }, {});

    return {
      profile: this.mapProfile(profile),
      metrics: {
        totalProducts: products.length,
        publishedProducts: products.filter(
          (product) => product.status === 'PUBLISHED',
        ).length,
        draftProducts: products.filter((product) => product.status === 'DRAFT')
          .length,
        totalInventory,
        averageImpactScore: avgImpactScore,
        totalCo2SavedKg: Number(totalCo2Saved.toFixed(1)),
      },
      topMaterials: Object.entries(materialCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, count })),
      latestProducts: products.slice(0, 3).map((product) => ({
        id: product.id,
        name: product.name,
        status: product.status,
        inventoryCount: product.inventoryCount,
        impactScore: product.impactScore,
      })),
    };
  }

  private async requireArtisanProfile(user: AuthenticatedUser) {
    if (!user.artisanProfileId) {
      throw new ForbiddenException(
        'This account does not have an artisan profile.',
      );
    }

    const profile = await this.prisma.artisanProfile.findUnique({
      where: { id: user.artisanProfileId },
    });

    if (!profile) {
      throw new NotFoundException('Artisan profile not found.');
    }

    return profile;
  }

  private mapProfile(profile: {
    id: string;
    slug: string;
    studioName: string;
    headline: string;
    bio: string;
    location: string;
    impactStatement: string;
    verificationStatus: string;
    verified: boolean;
    responseRate: number;
    averageRating: number;
    totalSales: number;
  }) {
    return {
      id: profile.id,
      slug: profile.slug,
      studioName: profile.studioName,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      impactStatement: profile.impactStatement,
      verificationStatus: profile.verificationStatus,
      verified: profile.verified,
      responseRate: profile.responseRate,
      averageRating: profile.averageRating,
      totalSales: profile.totalSales,
    };
  }
}
