import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  CRAFTMIND_MAX_HISTORY_MESSAGES,
  CRAFTMIND_STREAM_EVENT_DONE,
  CRAFTMIND_STREAM_EVENT_TOKEN,
} from './craftmind.constants';
import { chunkTextForStream } from './craftmind.helpers';
import { CraftmindProviderService } from './craftmind-provider.service';
import { CraftmindRetrievalService } from './craftmind-retrieval.service';
import { CraftmindChatDto } from './dto/craftmind-chat.dto';
import { CraftmindListingDraftDto } from './dto/craftmind-listing-draft.dto';

@Injectable()
export class CraftmindService {
  constructor(
    private readonly retrievalService: CraftmindRetrievalService,
    private readonly providerService: CraftmindProviderService,
    private readonly configService: ConfigService,
  ) {}

  async chat(user: AuthenticatedUser, dto: CraftmindChatDto) {
    const context = await this.retrievalService.buildContext(user, dto.prompt);
    const history = (dto.history ?? []).slice(-CRAFTMIND_MAX_HISTORY_MESSAGES);
    const response = await this.providerService.generateChat({
      role: user.role,
      prompt: dto.prompt,
      history,
      context,
    });

    return {
      reply: {
        role: 'assistant',
        content: response.text,
        provider: response.provider,
        model: response.model,
      },
      context,
      suggestedPrompts: this.buildSuggestedPrompts(dto.prompt),
    };
  }

  async generateListingDraft(
    user: AuthenticatedUser,
    dto: CraftmindListingDraftDto,
  ) {
    const metadata = await this.retrievalService.resolveListingMetadata({
      categoryId: dto.categoryId,
      ecoRatingId: dto.ecoRatingId,
      materialIds: dto.materialIds,
    });
    const context = await this.retrievalService.buildContext(
      user,
      [
        dto.prompt,
        metadata.categoryName,
        metadata.ecoRatingLabel,
        ...metadata.materialNames,
      ]
        .filter(Boolean)
        .join(' '),
    );
    const response = await this.providerService.generateListingDraft({
      role: user.role,
      prompt: dto.prompt,
      categoryName: metadata.categoryName,
      ecoRatingLabel: metadata.ecoRatingLabel,
      materialNames: metadata.materialNames,
      context,
    });

    return {
      draft: response.draft,
      context,
      provider: response.provider,
      model: response.model,
    };
  }

  async streamChat(
    user: AuthenticatedUser,
    dto: CraftmindChatDto,
    response: Response,
  ) {
    const chatResponse = await this.chat(user, dto);
    const delayMs = this.configService.get<number>('CRAFTMIND_STREAM_DELAY_MS', 18);

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders?.();

    for (const chunk of chunkTextForStream(chatResponse.reply.content)) {
      response.write(
        `event: ${CRAFTMIND_STREAM_EVENT_TOKEN}\ndata: ${JSON.stringify({
          chunk,
        })}\n\n`,
      );

      if (delayMs > 0) {
        await wait(delayMs);
      }
    }

    response.write(
      `event: ${CRAFTMIND_STREAM_EVENT_DONE}\ndata: ${JSON.stringify({
        context: chatResponse.context,
        provider: chatResponse.reply.provider,
        model: chatResponse.reply.model,
        suggestedPrompts: chatResponse.suggestedPrompts,
      })}\n\n`,
    );
    response.end();
  }

  private buildSuggestedPrompts(prompt: string) {
    const normalizedPrompt = prompt.toLowerCase();

    if (normalizedPrompt.includes('title') || normalizedPrompt.includes('name')) {
      return [
        'Rewrite this title to sound warmer and more artisan-led.',
        'Turn this into a short description with a stronger material hook.',
        'Suggest three SEO-friendly tags for this listing.',
      ];
    }

    if (
      normalizedPrompt.includes('story') ||
      normalizedPrompt.includes('description')
    ) {
      return [
        'Shorten this story for the product card.',
        'Add one stronger sourcing detail without overstating impact.',
        'Rewrite this for buyers who care about low-waste materials.',
      ];
    }

    return [
      'Generate a publish-ready title and short description.',
      'Help me turn this idea into a verified sustainability story.',
      'Suggest missing product facts I should confirm before publishing.',
    ];
  }
}

function wait(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
