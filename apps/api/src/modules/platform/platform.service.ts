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
          label: 'Artisans verifies',
          value: String(verifiedArtisans),
          detail:
            'Ateliers verifies pour leur sourcing responsable et leur transparence.',
        },
        {
          label: 'CO2 economise cette saison',
          value: `${(publishedProductStats._sum.co2SavedKg ?? 0).toFixed(1)}kg`,
          detail:
            'Compare aux alternatives industrielles sur les pieces actives du catalogue.',
        },
        {
          label: "Score d'impact moyen",
          value: `${Math.round(publishedProductStats._avg.impactScore ?? 0)}/100`,
          detail:
            'Prend en compte le sourcing, l emballage, la durabilite et l efficacite des livraisons.',
        },
      ],
      initiatives: storefrontSnapshot.initiatives,
      roadmapStatus: 'Fondations auth et catalogue en progression',
    };
  }
}
