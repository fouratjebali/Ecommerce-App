import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CraftmindChatDto } from './dto/craftmind-chat.dto';
import { CraftmindListingDraftDto } from './dto/craftmind-listing-draft.dto';
import { CraftmindService } from './craftmind.service';

@ApiTags('CraftMind')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ARTISAN)
@Controller({ path: 'craftmind', version: '1' })
export class CraftmindController {
  constructor(private readonly craftmindService: CraftmindService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Generate a catalog-aware CraftMind assistant response for artisans',
  })
  chat(@CurrentUser() user: AuthenticatedUser, @Body() dto: CraftmindChatDto) {
    return this.craftmindService.chat(user, dto);
  }

  @Post('chat/stream')
  @ApiOperation({
    summary: 'Stream a CraftMind assistant response for the vendor workspace',
  })
  async streamChat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CraftmindChatDto,
    @Res() response: Response,
  ) {
    await this.craftmindService.streamChat(user, dto, response);
  }

  @Post('listing-drafts')
  @ApiOperation({
    summary: 'Generate a listing draft grounded in artisan and catalog context',
  })
  generateListingDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CraftmindListingDraftDto,
  ) {
    return this.craftmindService.generateListingDraft(user, dto);
  }
}
