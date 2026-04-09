import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArtisansService } from './artisans.service';

@ApiTags('Artisans')
@Controller({ path: 'artisans', version: '1' })
export class ArtisansController {
  constructor(private readonly artisansService: ArtisansService) {}

  @Get()
  @ApiOperation({ summary: 'List public artisan profiles' })
  listArtisans() {
    return this.artisansService.listArtisans();
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured artisan profiles' })
  getFeatured() {
    return this.artisansService.getFeatured();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a public artisan profile by slug' })
  getBySlug(@Param('slug') slug: string) {
    return this.artisansService.getBySlug(slug);
  }
}
