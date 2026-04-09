import { Injectable } from '@nestjs/common';
import { storefrontSnapshot } from '../storefront/storefront.data';

@Injectable()
export class PlatformService {
  getOverview() {
    return {
      metrics: storefrontSnapshot.metrics,
      initiatives: storefrontSnapshot.initiatives,
      roadmapStatus: 'Sprint 1 foundation in progress',
    };
  }
}
