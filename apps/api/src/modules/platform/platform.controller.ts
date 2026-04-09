import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformService } from './platform.service';

@ApiTags('Platform')
@Controller({ path: 'platform', version: '1' })
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get platform metrics and Sprint 1 initiatives' })
  getOverview() {
    return this.platformService.getOverview();
  }
}
