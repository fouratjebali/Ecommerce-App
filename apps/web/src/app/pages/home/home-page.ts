import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import { fallbackStorefront } from '../../data/fallback-storefront';
import { CatalogFilters, CatalogItem, CatalogResponse } from '../../models/catalog';
import { ArtisanProfile, StorefrontProduct } from '../../models/storefront';
import { MarketLabelPipe } from '../../pipes/market-label.pipe';
import { TndCurrencyPipe } from '../../pipes/tnd-currency.pipe';
import { AuthService } from '../../services/auth.service';
import { CartApiService } from '../../services/cart-api.service';
import { CatalogApiService } from '../../services/catalog-api.service';
import { StorefrontService } from '../../services/storefront.service';

interface NoticeState {
  tone: 'success' | 'error';
  text: string;
}

interface HomeProductCard {
  id: string;
  slug: string;
  name: string;
  description: string;
  artisanName: string;
  location: string;
  category: string;
  material: string;
  imageUrl: string | null;
  imageAlt: string;
  imageHint: string;
  price: number;
  impactScore: number;
  co2SavedKg: number;
}

interface HomeCategoryCard {
  title: string;
  eyebrow: string;
  description: string;
  helper: string;
  route: string;
}

interface TrustCard {
  eyebrow: string;
  badge: string;
  title: string;
  copy: string;
}

interface ToolCard {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  points: string[];
  route: string;
  cta: string;
}

interface FooterLink {
  label: string;
  route?: string;
  href?: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const emptyCatalogResponse: CatalogResponse = {
  items: [],
  total: 0,
  filtersApplied: {},
};

@Component({
  selector: 'app-home-page',
  imports: [DecimalPipe, FormsModule, RouterLink, TndCurrencyPipe, MarketLabelPipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePageComponent {
  protected readonly authService = inject(AuthService);

  private readonly storefrontService = inject(StorefrontService);
  private readonly catalogApiService = inject(CatalogApiService);
  private readonly cartApiService = inject(CartApiService);

  protected readonly homepage = toSignal(this.storefrontService.getHomepage(), {
    initialValue: fallbackStorefront,
  });

  protected readonly searchQuery = signal('');
  protected readonly notice = signal<NoticeState | null>(null);

  protected readonly headerLinks = [
    { label: 'Categories', href: '#categories' },
    { label: 'A la une', href: '#featured-products' },
    { label: 'Nouveautes', href: '#new-arrivals' },
    { label: 'Artisans', href: '#sell' },
    { label: 'Outils', href: '#market-tools' },
  ];

  protected readonly trustCards: TrustCard[] = [
    {
      eyebrow: 'Selection soignee',
      badge: '01',
      title: 'Produits faits main',
      copy:
        'Des pieces faconnees en petites series avec des finitions visibles, des matieres choisies et une vraie personnalite d atelier.',
    },
    {
      eyebrow: 'Ancrage local',
      badge: '02',
      title: 'Createurs tunisiens',
      copy:
        'Une selection d ateliers, de gestes et de savoir-faire installes en Tunisie, du littoral aux villes d artisanat.',
    },
    {
      eyebrow: 'Parcours rassurant',
      badge: '03',
      title: 'Paiement securise',
      copy:
        'Un parcours d achat lisible, en dinar tunisien, pense pour commander en confiance et sans zone floue.',
    },
    {
      eyebrow: 'Livraison de proximite',
      badge: '04',
      title: 'Livraison locale',
      copy:
        'Des commandes preparees pour des envois regionaux plus simples, plus coherents et mieux adaptes au marche tunisien.',
    },
  ];

  protected readonly toolCards: ToolCard[] = [
    {
      id: 'visual-search',
      eyebrow: 'Recherche visuelle',
      title: "Retrouvez une creation a partir d'une simple photo.",
      copy:
        "Chargez l'image d'un objet qui vous inspire et GreenCraft remontera les produits les plus proches du catalogue.",
      points: [
        'Recherche par similarite visuelle',
        'Filtres par artisan, prix et impact',
        'Parcours ideal pour la decouverte',
      ],
      route: '/visual-search',
      cta: 'Essayer la recherche visuelle',
    },
    {
      id: 'craftmind',
      eyebrow: 'Assistant vendeur',
      title: 'Aidez les artisans a mieux raconter leurs creations.',
      copy:
        'Un assistant aide les vendeurs a rediger des fiches claires, utiles et adaptees aux acheteurs.',
      points: [
        'Brouillons de fiches produit',
        'Aide a la redaction durable',
        'Support vendeur directement dans la plateforme',
      ],
      route: '/vendor',
      cta: "Ouvrir l'espace vendeur",
    },
  ];

  protected readonly footerColumns: FooterColumn[] = [
    {
      title: 'Explorer',
      links: [
        { label: 'La boutique', route: '/catalog' },
        { label: 'Categories', href: '#categories' },
        { label: 'Produits a la une', href: '#featured-products' },
      ],
    },
    {
      title: 'Experiences',
      links: [
        { label: 'Recherche visuelle', route: '/visual-search' },
        { label: 'Panier', route: '/cart' },
        { label: 'Paiement', route: '/payment' },
      ],
    },
    {
      title: 'Pour les artisans',
      links: [
        { label: 'Espace vendeur', route: '/vendor' },
        { label: 'Connexion', route: '/auth' },
        { label: 'Communaute', href: '#community' },
      ],
    },
  ];

  private readonly featuredCatalog = toSignal(
    this.catalogSection({ sort: 'featured' }),
    { initialValue: emptyCatalogResponse },
  );

  private readonly newestCatalog = toSignal(
    this.catalogSection({ sort: 'newest' }),
    { initialValue: emptyCatalogResponse },
  );

  private readonly recommendedCatalog = toSignal(
    this.catalogSection({ sort: 'impact-desc' }),
    { initialValue: emptyCatalogResponse },
  );

  private readonly fallbackProductCards = computed(() =>
    this.homepage().featuredProducts.map((product, index) =>
      this.mapStorefrontProduct(product, index),
    ),
  );

  private readonly featuredSectionProducts = computed(() =>
    this.buildDistinctSection(
      this.featuredCatalog().items.map((item) => this.mapCatalogProduct(item)),
      [],
      this.fallbackProductCards(),
    ),
  );

  private readonly newArrivalSectionProducts = computed(() =>
    this.buildDistinctSection(
      this.newestCatalog().items.map((item) => this.mapCatalogProduct(item)),
      this.featuredSectionProducts().map((product) => product.id),
      this.rotateProducts(this.fallbackProductCards(), 1),
    ),
  );

  private readonly recommendedSectionProducts = computed(() =>
    this.buildDistinctSection(
      this.recommendedCatalog().items.map((item) => this.mapCatalogProduct(item)),
      [
        ...this.featuredSectionProducts().map((product) => product.id),
        ...this.newArrivalSectionProducts().map((product) => product.id),
      ],
      this.rotateProducts(this.fallbackProductCards(), 2),
    ),
  );

  protected readonly heroSpotlight = computed<HomeProductCard>(() => {
    return this.featuredSectionProducts()[0] ?? this.fallbackProductCards()[0];
  });

  protected readonly leadArtisan = computed<ArtisanProfile>(() => this.homepage().artisans[0]);

  protected readonly categoryCards = computed<HomeCategoryCard[]>(() => {
    const dynamicCards = this.homepage().categories.map((category) => ({
      title: category.name,
      eyebrow: category.materialFocus,
      description: category.description,
      helper: category.impactHighlight,
      route: '/catalog',
    }));

    const curatedCards: HomeCategoryCard[] = [
      {
        title: 'Textile',
        eyebrow: 'Ateliers du quotidien',
        description:
          'Sacs, pochettes et pieces souples pensees pour un usage durable et local.',
        helper: 'Des matieres revalorisees pour les achats utiles.',
        route: '/catalog',
      },
      {
        title: 'Accessoires',
        eyebrow: 'Petites pieces a offrir',
        description:
          'Objets de style et essentiels artisanaux faciles a adopter ou a offrir.',
        helper: 'Une porte d entree simple vers l artisanat tunisien.',
        route: '/catalog',
      },
      {
        title: 'Cadeaux',
        eyebrow: 'Selections chaleureuses',
        description:
          'Des idees choisies pour les cadeaux de maison, de fete ou de visite.',
        helper: 'Des creations utiles, memorables et faites main.',
        route: '/catalog',
      },
    ];

    const merged = [...dynamicCards, ...curatedCards];
    const seen = new Set<string>();

    return merged.filter((card) => {
      const key = card.title.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    }).slice(0, 6);
  });

  protected readonly featuredProducts = computed(() =>
    this.filterProducts(this.featuredSectionProducts()),
  );

  protected readonly newArrivalProducts = computed(() =>
    this.filterProducts(this.newArrivalSectionProducts()),
  );

  protected readonly recommendedProducts = computed(() =>
    this.filterProducts(this.recommendedSectionProducts()),
  );

  protected readonly hasSearchMatches = computed(() => {
    return (
      this.featuredProducts().length +
        this.newArrivalProducts().length +
        this.recommendedProducts().length >
      0
    );
  });

  protected readonly accountLabel = computed(() => {
    const user = this.authService.user();

    if (!user) {
      return 'Connexion / inscription';
    }

    if (user.role === 'ARTISAN') {
      return 'Mon atelier';
    }

    if (user.role === 'BUYER') {
      return 'Mon compte';
    }

    if (user.role === 'ADMIN') {
      return 'Administration';
    }

    return 'Mon espace';
  });

  protected readonly accountRoute = computed(() => {
    const user = this.authService.user();

    if (!user) {
      return '/auth';
    }

    if (user.role === 'ARTISAN') {
      return '/vendor';
    }

    if (user.role === 'BUYER') {
      return '/orders';
    }

    if (user.role === 'ADMIN') {
      return '/admin';
    }

    return '/auth';
  });

  protected readonly workspaceLabel = computed(() => {
    const user = this.authService.user();

    if (user?.role === 'ADMIN') {
      return "Ouvrir l'administration";
    }

    return user?.role === 'ARTISAN' ? 'Acceder a mon atelier' : 'Vendre mes creations';
  });

  protected readonly workspaceRoute = computed(() => {
    const user = this.authService.user();

    if (user?.role === 'ADMIN') {
      return '/admin';
    }

    return '/vendor';
  });

  constructor() {
    void this.authService.ensureProfile();
  }

  protected updateSearch(value: string) {
    this.searchQuery.set(value);
  }

  protected applySearch() {
    this.searchQuery.update((query) => query.trim());
  }

  protected clearSearch() {
    this.searchQuery.set('');
  }

  protected async addToCart(productId: string) {
    this.notice.set(null);

    try {
      await firstValueFrom(this.cartApiService.addItem(productId, 1));
      this.notice.set({
        tone: 'success',
        text: 'Le produit a ete ajoute a votre panier.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: "Impossible d'ajouter ce produit au panier pour le moment.",
      });
    }
  }

  private catalogSection(filters: CatalogFilters) {
    return this.catalogApiService.getCatalog(filters).pipe(
      catchError(() => of(emptyCatalogResponse)),
    );
  }

  private buildDistinctSection(
    primaryItems: HomeProductCard[],
    excludedIds: string[],
    fallbackItems: HomeProductCard[],
  ) {
    const excluded = new Set(excludedIds);
    const selected: HomeProductCard[] = [];

    const appendUnique = (items: HomeProductCard[]) => {
      for (const item of items) {
        if (selected.length >= 4) {
          break;
        }

        if (excluded.has(item.id) || selected.some((entry) => entry.id === item.id)) {
          continue;
        }

        selected.push(item);
      }
    };

    appendUnique(primaryItems);
    appendUnique(fallbackItems);

    return selected;
  }

  private mapCatalogProduct(product: CatalogItem): HomeProductCard {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.shortDescription,
      artisanName: product.artisan.studioName,
      location: product.artisan.location,
      category: product.category.name,
      material: product.materials[0]?.name ?? 'Selection artisanale',
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt,
      imageHint: product.name,
      price: product.price.amountInCents / 100,
      impactScore: product.impactScore,
      co2SavedKg: product.co2SavedKg,
    };
  }

  private mapStorefrontProduct(product: StorefrontProduct, index: number): HomeProductCard {
    const fallbackCategory =
      this.homepage().categories[index % this.homepage().categories.length]?.name ??
      'Selection artisanale';

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.storySnippet,
      artisanName: product.artisanName,
      location: product.region,
      category: fallbackCategory,
      material: product.material,
      imageUrl: product.imageUrl,
      imageAlt: product.imageAlt,
      imageHint: product.imageHint,
      price: product.price,
      impactScore: product.impactScore,
      co2SavedKg: product.co2SavedKg,
    };
  }

  private rotateProducts(products: HomeProductCard[], offset: number) {
    if (!products.length) {
      return [];
    }

    const safeOffset = offset % products.length;
    return [...products.slice(safeOffset), ...products.slice(0, safeOffset)];
  }

  private filterProducts(products: HomeProductCard[]) {
    const query = this.searchQuery().trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        product.description,
        product.artisanName,
        product.category,
        product.material,
        product.location,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }
}
