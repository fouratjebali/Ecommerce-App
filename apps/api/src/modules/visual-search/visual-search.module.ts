import { Module } from '@nestjs/common';
import { VisualFeatureExtractorService } from './visual-feature-extractor.service';
import { VisualSearchCacheService } from './visual-search-cache.service';
import { VisualSearchController } from './visual-search.controller';
import { VisualSearchListener } from './visual-search.listener';
import { VisualSearchService } from './visual-search.service';

@Module({
  controllers: [VisualSearchController],
  providers: [
    VisualSearchService,
    VisualSearchCacheService,
    VisualFeatureExtractorService,
    VisualSearchListener,
  ],
})
export class VisualSearchModule {}
