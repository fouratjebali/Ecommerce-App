import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { fallbackStorefront } from '../../data/fallback-storefront';
import { ArtisanProfile, StorefrontProduct } from '../../models/storefront';
import { StorefrontService } from '../../services/storefront.service';

type InnovationMode = 'visual-search' | 'craftmind';

interface InnovationPanel {
  eyebrow: string;
  title: string;
  summary: string;
  highlight: string;
  points: string[];
  ctaLabel: string;
  ctaRoute: string;
}

@Component({
  selector: 'app-home-page',
  imports: [CurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePageComponent {
  private readonly storefrontService = inject(StorefrontService);

  protected readonly homepage = toSignal(this.storefrontService.getHomepage(), {
    initialValue: fallbackStorefront,
  });

  protected readonly navigation = [
    { label: 'Collection', href: '#collection' },
    { label: 'Featured', href: '#featured' },
    { label: 'Artisans', href: '#artisans' },
    { label: 'Bundle Lab', href: '#bundle' },
    { label: 'AI Studio', href: '#ai' },
  ];

  protected readonly quickLinks = [
    { label: 'Shop catalog', route: '/catalog' },
    { label: 'Find by photo', route: '/visual-search' },
    { label: 'Artisan sign in', route: '/auth' },
    { label: 'Vendor workspace', route: '/vendor' },
  ];

  protected readonly activeInnovation = signal<InnovationMode>('visual-search');

  protected readonly heroProduct = computed<StorefrontProduct>(
    () => this.homepage().featuredProducts[0],
  );

  protected readonly leadArtisan = computed<ArtisanProfile>(() => this.homepage().artisans[0]);

  protected readonly supportingArtisans = computed(() => this.homepage().artisans.slice(1));

  protected readonly materialPills = computed(() =>
    [...new Set(this.homepage().featuredProducts.map((product) => product.material))].slice(0, 3),
  );

  protected readonly bundleSummary = computed(() => {
    const bundle = this.homepage().featuredProducts;
    const total = bundle.reduce((sum, item) => sum + item.price, 0);
    const co2SavedKg = bundle.reduce((sum, item) => sum + item.co2SavedKg, 0);
    const bundleDiscount = Math.round(total * 0.12);

    return {
      bundle,
      total,
      co2SavedKg,
      bundleDiscount,
      bundledPrice: total - bundleDiscount,
    };
  });

  protected readonly innovationPanels: Record<InnovationMode, InnovationPanel> = {
    'visual-search': {
      eyebrow: 'Visual search',
      title: 'Find sustainable matches from a single inspiration photo.',
      summary:
        'Upload a bowl, tote, or lamp you love and GreenCraft will surface the closest handmade alternatives with material-aware filters.',
      highlight: 'Embeddings stored in pgvector with cosine similarity and faceted refinement.',
      points: [
        'Photo upload with nearest-neighbor matching',
        'Hybrid filtering by material, artisan, price, and impact score',
        'Cold-start fallback recommendations cached in Redis',
      ],
      ctaLabel: 'Try visual search',
      ctaRoute: '/visual-search',
    },
    craftmind: {
      eyebrow: 'CraftMind assistant',
      title: 'Generate artisan-first listing copy and sustainability guidance.',
      summary:
        'CraftMind will help vendors write product stories, clarify sourcing claims, and answer buyer questions with streaming responses.',
      highlight: 'RAG over the product catalog and artisan knowledge base for grounded answers.',
      points: [
        'AI-assisted product storytelling and metadata completion',
        'Buyer chat with impact-aware recommendations',
        'Catalog knowledge retrieval before checkout or vendor publishing',
      ],
      ctaLabel: 'Open vendor workspace',
      ctaRoute: '/vendor',
    },
  };

  protected readonly activePanel = computed(() => this.innovationPanels[this.activeInnovation()]);

  protected setInnovation(mode: InnovationMode) {
    this.activeInnovation.set(mode);
  }
}
