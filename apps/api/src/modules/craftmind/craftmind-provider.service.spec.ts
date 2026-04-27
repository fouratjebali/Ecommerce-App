import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { CraftmindProviderService } from './craftmind-provider.service';

describe('CraftmindProviderService', () => {
  const baseChatRequest = {
    role: UserRole.ARTISAN,
    prompt: 'Help me write a warmer product description for my recycled stoneware bowl.',
    history: [],
    context: {
      query: 'recycled stoneware bowl',
      summary: 'Grounded in artisan profile and product references.',
      documents: [
        {
          id: 'artisan-1',
          kind: 'artisan-profile' as const,
          title: 'Noura Clay Studio',
          snippet: 'Ceramic studio focused on lower-waste glazing.',
          score: 100,
          metadata: {
            artisanName: 'Noura Bennani',
          },
        },
        {
          id: 'product-1',
          kind: 'vendor-product' as const,
          title: 'Bloom Serving Bowl',
          snippet: 'Terracotta bowl with reclaimed clay blend.',
          score: 12,
        },
      ],
    },
  };

  it('generates a local chat response when the provider is local', async () => {
    const service = new CraftmindProviderService({
      get: (key: string, defaultValue?: unknown) => {
        if (key === 'CRAFTMIND_PROVIDER') {
          return 'local';
        }

        return defaultValue;
      },
    } as ConfigService);

    const result = await service.generateChat(baseChatRequest);

    expect(result.provider).toBe('local');
    expect(result.text).toContain('CraftMind a analyse votre demande');
    expect(result.text).toContain('Bloom Serving Bowl');
  });

  it('generates a normalized local listing draft when Anthropic is unavailable', async () => {
    const service = new CraftmindProviderService({
      get: (key: string, defaultValue?: unknown) => {
        if (key === 'CRAFTMIND_PROVIDER') {
          return 'anthropic';
        }

        if (key === 'CRAFTMIND_MODEL') {
          return 'claude-sonnet-4-5';
        }

        return defaultValue;
      },
    } as ConfigService);

    const result = await service.generateListingDraft({
      role: UserRole.ARTISAN,
      prompt: 'A shallow serving bowl inspired by Atlantic coast clay tones.',
      categoryName: 'Tableware',
      ecoRatingLabel: 'Earth Positive',
      materialNames: ['Recycled Stoneware', 'Low-fire Glaze'],
      context: baseChatRequest.context,
    });

    expect(result.provider).toBe('local');
    expect(result.draft.slug).toMatch(/tableware/);
    expect(result.draft.launchChecklist.length).toBeGreaterThan(0);
  });
});
