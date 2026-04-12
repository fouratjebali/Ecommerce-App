import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { VisualSearchApiService } from './visual-search-api.service';

describe('VisualSearchApiService', () => {
  let service: VisualSearchApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VisualSearchApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(VisualSearchApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('posts image uploads and filters to the visual-search endpoint', () => {
    const file = new File(['image-bytes'], 'lamp.png', {
      type: 'image/png',
    });

    service
      .searchByImage(file, {
        category: ['lighting-and-decor'],
        material: ['river-reed'],
        minImpactScore: 80,
        limit: 6,
      })
      .subscribe();

    const request = httpTesting.expectOne('/api/v1/visual-search/query');
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBeTrue();

    request.flush({
      query: {
        dominantColorHex: '#665533',
        filtersApplied: {
          category: ['lighting-and-decor'],
          material: ['river-reed'],
          ecoRating: [],
          artisan: [],
          minImpactScore: 80,
          maxPrice: null,
          limit: 6,
        },
        fallbackMode: null,
      },
      items: [],
    });
  });
});
