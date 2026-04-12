import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CatalogService } from './catalog.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { UpsertProductDto } from './dto/upsert-product.dto';

@ApiTags('Catalog')
@Controller({ path: 'catalog', version: '1' })
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Browse the public marketplace catalog' })
  getCatalog(@Query() query: CatalogQueryDto) {
    return this.catalogService.getPublicCatalog(query);
  }

  @Get('facets')
  @ApiOperation({ summary: 'Get public faceted search data for the catalog' })
  getCatalogFacets() {
    return this.catalogService.getCatalogFacets();
  }

  @Get('highlights')
  @ApiOperation({
    summary: 'Get highlighted categories and products for the storefront',
  })
  getHighlights() {
    return this.catalogService.getHighlights();
  }

  @Get('vendor/attributes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get vendor form metadata for product creation and editing',
  })
  getVendorAttributeOptions() {
    return this.catalogService.getVendorAttributeOptions();
  }

  @Get('vendor/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get products belonging to the authenticated artisan',
  })
  getVendorProducts(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.getVendorProducts(user);
  }

  @Post('vendor/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product for the authenticated artisan' })
  createVendorProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertProductDto,
  ) {
    return this.catalogService.createVendorProduct(user, dto);
  }

  @Patch('vendor/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a product owned by the authenticated artisan',
  })
  updateVendorProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') productId: string,
    @Body() dto: UpsertProductDto,
  ) {
    return this.catalogService.updateVendorProduct(user, productId, dto);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get public product details by slug' })
  getProductBySlug(@Param('slug') slug: string) {
    return this.catalogService.getProductBySlug(slug);
  }
}
