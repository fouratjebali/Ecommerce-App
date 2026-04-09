export interface StorefrontMetric {
  label: string;
  value: string;
  detail: string;
}

export interface StorefrontCategory {
  slug: string;
  name: string;
  description: string;
  materialFocus: string;
  impactHighlight: string;
}

export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  artisanName: string;
  region: string;
  material: string;
  price: number;
  currency: string;
  co2SavedKg: number;
  impactScore: number;
  storySnippet: string;
  imageHint: string;
}

export interface ArtisanProfile {
  id: string;
  name: string;
  studio: string;
  location: string;
  specialty: string;
  impactBadge: string;
  story: string;
}

export interface PlatformInitiative {
  title: string;
  summary: string;
  milestone: string;
}

export interface StorefrontHomepage {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  metrics: StorefrontMetric[];
  categories: StorefrontCategory[];
  featuredProducts: StorefrontProduct[];
  artisans: ArtisanProfile[];
  initiatives: PlatformInitiative[];
}
