import { Module } from '@nestjs/common';
import { ArtisansModule } from '../artisans/artisans.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PlatformModule } from '../platform/platform.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [CatalogModule, ArtisansModule, PlatformModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
