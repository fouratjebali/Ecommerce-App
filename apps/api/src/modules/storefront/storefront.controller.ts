import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';

@ApiTags('Storefront')
@Controller({ path: 'storefront', version: '1' })
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('homepage')
  @ApiOperation({ summary: 'Get the storefront homepage payload' })
  getHomepage() {
    return this.storefrontService.getHomepage();
  }
}
