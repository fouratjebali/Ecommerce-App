import { Module } from '@nestjs/common';
import { ArtisansController } from './artisans.controller';
import { ArtisansService } from './artisans.service';

@Module({
  controllers: [ArtisansController],
  providers: [ArtisansService],
  exports: [ArtisansService],
})
export class ArtisansModule {}
