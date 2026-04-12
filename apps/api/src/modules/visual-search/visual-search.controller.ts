import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  VisualSearchQueryDto,
  VisualSearchRecommendationsQueryDto,
} from './dto/visual-search-query.dto';
import { VisualSearchService } from './visual-search.service';

@ApiTags('Visual Search')
@Controller({ path: 'visual-search', version: '1' })
export class VisualSearchController {
  constructor(private readonly visualSearchService: VisualSearchService) {}

  @Post('query')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 5_000_000,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Run image-based product matching against the visual index',
  })
  queryVisualSearch(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: VisualSearchQueryDto,
  ) {
    return this.visualSearchService.searchByImage(file, dto);
  }

  @Get('recommendations/:slug')
  @ApiOperation({
    summary: 'Get cached visually similar products for a published product',
  })
  getRecommendations(
    @Param('slug') slug: string,
    @Query() dto: VisualSearchRecommendationsQueryDto,
  ) {
    return this.visualSearchService.getRecommendationsByProductSlug(slug, dto);
  }
}
