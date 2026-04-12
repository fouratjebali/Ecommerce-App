import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { validateEnvironment } from './config/environment';
import { AuthModule } from './modules/auth/auth.module';
import { ArtisansModule } from './modules/artisans/artisans.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CartModule } from './modules/cart/cart.module';
import { CommerceEventsModule } from './modules/commerce-events/commerce-events.module';
import { HealthModule } from './modules/health/health.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PlatformModule } from './modules/platform/platform.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { UsersModule } from './modules/users/users.module';
import { VendorsModule } from './modules/vendors/vendors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnvironment,
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    ArtisansModule,
    VendorsModule,
    CommerceEventsModule,
    PlatformModule,
    StorefrontModule,
  ],
})
export class AppModule {}
