import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { CraftmindProviderService } from './craftmind-provider.service';
import { CraftmindRetrievalService } from './craftmind-retrieval.service';
import { CraftmindService } from './craftmind.service';

describe('CraftmindService', () => {
  const artisanUser = {
    sub: 'artisan-1',
    email: 'noura@greencraft.local',
    fullName: 'Noura Bennani',
    role: UserRole.ARTISAN,
    artisanProfileId: 'artisan-profile-1',
    artisanSlug: 'noura-clay-studio',
  };

  const contextBundle = {
    query: 'serving bowl copy',
    summary: 'Noura Clay Studio context plus catalog references.',
    documents: [
      {
        id: 'artisan-1',
        kind: 'artisan-profile' as const,
        title: 'Noura Clay Studio',
        snippet: 'Ceramic studio rooted in reclaimed clay blends.',
        score: 100,
      },
    ],
  };

  it('returns a chat response with suggested follow-up prompts', async () => {
    const retrievalService = {
      buildContext: jest.fn().mockResolvedValue(contextBundle),
      resolveListingMetadata: jest.fn(),
    };
    const providerService = {
      generateChat: jest.fn().mockResolvedValue({
        provider: 'local',
        model: 'craftmind-local-rag',
        text: 'Here is a grounded product description.',
      }),
      generateListingDraft: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CraftmindService,
        {
          provide: CraftmindRetrievalService,
          useValue: retrievalService,
        },
        {
          provide: CraftmindProviderService,
          useValue: providerService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, defaultValue?: unknown) => defaultValue,
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(CraftmindService);
    const result = await service.chat(artisanUser as never, {
      prompt: 'Help me improve this product title.',
      history: [],
    });

    expect(retrievalService.buildContext).toHaveBeenCalledWith(
      artisanUser,
      'Help me improve this product title.',
    );
    expect(result.reply.content).toContain('grounded product description');
    expect(result.suggestedPrompts[0]).toContain('Reecrivez ce titre');
  });

  it('streams chat chunks as server-sent events', async () => {
    const retrievalService = {
      buildContext: jest.fn().mockResolvedValue(contextBundle),
      resolveListingMetadata: jest.fn(),
    };
    const providerService = {
      generateChat: jest.fn().mockResolvedValue({
        provider: 'local',
        model: 'craftmind-local-rag',
        text: 'First sentence. Second sentence.',
      }),
      generateListingDraft: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CraftmindService,
        {
          provide: CraftmindRetrievalService,
          useValue: retrievalService,
        },
        {
          provide: CraftmindProviderService,
          useValue: providerService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) => {
              if (key === 'CRAFTMIND_STREAM_DELAY_MS') {
                return 0;
              }

              return defaultValue;
            },
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(CraftmindService);
    const response = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    await service.streamChat(
      artisanUser as never,
      {
        prompt: 'Draft copy for this bowl.',
        history: [],
      },
      response as never,
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/event-stream',
    );
    expect(response.write).toHaveBeenCalledTimes(3);
    expect(response.end).toHaveBeenCalled();
  });

  it('generates a listing draft with retrieved metadata', async () => {
    const retrievalService = {
      buildContext: jest.fn().mockResolvedValue(contextBundle),
      resolveListingMetadata: jest.fn().mockResolvedValue({
        categoryName: 'Tableware',
        ecoRatingLabel: 'Earth Positive',
        materialNames: ['Recycled Stoneware'],
      }),
    };
    const providerService = {
      generateChat: jest.fn(),
      generateListingDraft: jest.fn().mockResolvedValue({
        provider: 'local',
        model: 'craftmind-local-rag',
        draft: {
          name: 'Atlantic Tableware',
          slug: 'atlantic-tableware',
          shortDescription: 'Short description',
          description: 'Long description',
          story: 'Story',
          materials: ['Recycled Stoneware'],
          tags: ['tableware'],
          seoTitle: 'SEO title',
          seoDescription: 'SEO description',
          launchChecklist: ['Review claims'],
        },
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CraftmindService,
        {
          provide: CraftmindRetrievalService,
          useValue: retrievalService,
        },
        {
          provide: CraftmindProviderService,
          useValue: providerService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, defaultValue?: unknown) => defaultValue,
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(CraftmindService);
    const result = await service.generateListingDraft(artisanUser as never, {
      prompt: 'A serving bowl with warm terracotta tones.',
      categoryId: 'category-1',
      ecoRatingId: 'eco-1',
      materialIds: ['material-1'],
    });

    expect(retrievalService.resolveListingMetadata).toHaveBeenCalled();
    expect(providerService.generateListingDraft).toHaveBeenCalled();
    expect(result.draft.slug).toBe('atlantic-tableware');
  });
});
