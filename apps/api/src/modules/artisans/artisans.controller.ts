import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArtisansService } from './artisans.service';

@ApiTags('Artisans')
@Controller({ path: 'artisans', version: '1' })
export class ArtisansController {
  constructor(private readonly artisansService: ArtisansService) {}

  @Get('featured')
  @ApiOperation({ summary: 'Get featured artisan profiles' })
  getFeatured() {
    return this.artisansService.getFeatured();
  }
}
