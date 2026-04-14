import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CraftmindApiService } from './craftmind-api.service';
import { AuthService } from './auth.service';

describe('CraftmindApiService', () => {
  let service: CraftmindApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CraftmindApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            accessToken: () => 'token-123',
          },
        },
      ],
    });

    service = TestBed.inject(CraftmindApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('posts vendor chat prompts to the CraftMind endpoint', () => {
    service
      .chat({
        prompt: 'Help me improve this title.',
        history: [],
      })
      .subscribe();

    const request = httpTesting.expectOne('/api/v1/craftmind/chat');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.prompt).toContain('improve this title');

    request.flush({
      reply: {
        role: 'assistant',
        content: 'Here is a stronger title.',
        provider: 'local',
        model: 'craftmind-local-rag',
      },
      context: {
        query: 'title',
        summary: 'Context summary',
        documents: [],
      },
      suggestedPrompts: [],
    });
  });

  it('posts listing draft generation payloads to the CraftMind endpoint', () => {
    service
      .generateListingDraft({
        prompt: 'A wide serving bowl in recycled clay.',
        categoryId: 'category-1',
        ecoRatingId: 'eco-1',
        materialIds: ['material-1'],
      })
      .subscribe();

    const request = httpTesting.expectOne('/api/v1/craftmind/listing-drafts');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.materialIds).toEqual(['material-1']);

    request.flush({
      draft: {
        name: 'Atlantic Tableware',
        slug: 'atlantic-tableware',
        shortDescription: 'Short description',
        description: 'Description',
        story: 'Story',
        materials: ['Recycled Stoneware'],
        tags: ['tableware'],
        seoTitle: 'SEO title',
        seoDescription: 'SEO description',
        launchChecklist: ['Review claims'],
      },
      context: {
        query: 'tableware',
        summary: 'Context summary',
        documents: [],
      },
      provider: 'local',
      model: 'craftmind-local-rag',
    });
  });
});
