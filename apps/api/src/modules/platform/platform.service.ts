import { Injectable } from '@nestjs/common';
import { ProductStatus, VendorStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { storefrontSnapshot } from '../storefront/storefront.data';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [verifiedArtisans, publishedProductStats] = await Promise.all([
      this.prisma.artisanProfile.count({
        where: {
          verificationStatus: VendorStatus.ACTIVE,
          verified: true,
        },
      }),
      this.prisma.product.aggregate({
        where: {
          status: ProductStatus.PUBLISHED,
        },
        _sum: {
          co2SavedKg: true,
        },
        _avg: {
          impactScore: true,
        },
      }),
    ]);

    return {
      metrics: [
        {
          label: 'Verified artisans',
          value: String(verifiedArtisans),
          detail:
            'Studios screened for sustainable sourcing and transparent storytelling.',
        },
        {
          label: 'CO2 saved this season',
          value: `${(publishedProductStats._sum.co2SavedKg ?? 0).toFixed(1)}kg`,
          detail:
            'Compared with mass-produced alternatives across active catalogue items.',
        },
        {
          label: 'Average impact score',
          value: `${Math.round(publishedProductStats._avg.impactScore ?? 0)}/100`,
          detail:
            'Blends sourcing, packaging, durability, and regional delivery efficiency.',
        },
      ],
      initiatives: storefrontSnapshot.initiatives,
      roadmapStatus: 'Sprint 2 auth and catalog foundation in progress',
    };
  }
}
