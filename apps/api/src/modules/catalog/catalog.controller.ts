import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('Catalog')
@Controller({ path: 'catalog', version: '1' })
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('highlights')
  @ApiOperation({ summary: 'Get highlighted categories and products for the storefront' })
  getHighlights() {
    return this.catalogService.getHighlights();
  }
}
