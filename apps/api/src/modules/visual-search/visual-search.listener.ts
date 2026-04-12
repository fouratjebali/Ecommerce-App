import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { VISUAL_SEARCH_PRODUCT_UPSERTED_EVENT } from './visual-search.constants';
import { VisualSearchService } from './visual-search.service';

@Injectable()
export class VisualSearchListener {
  constructor(private readonly visualSearchService: VisualSearchService) {}

  @OnEvent(VISUAL_SEARCH_PRODUCT_UPSERTED_EVENT)
  async onProductUpserted() {
    await this.visualSearchService.handleProductUpserted();
  }
}
