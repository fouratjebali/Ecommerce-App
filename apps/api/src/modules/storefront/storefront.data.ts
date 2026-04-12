import { StorefrontSnapshot } from './storefront.types';

export const storefrontSnapshot: StorefrontSnapshot = {
  hero: {
    eyebrow: 'Traceable handmade essentials',
    title:
      'The sustainable marketplace where every craft carries its impact story.',
    subtitle:
      'GreenCraft connects eco-conscious buyers with artisans using reclaimed, low-waste, and naturally sourced materials.',
    primaryCta: 'Explore the spring collection',
    secondaryCta: 'Meet the artisans',
  },
  metrics: [
    {
      label: 'Verified artisans',
      value: '64',
      detail:
        'Studios screened for sustainable sourcing and transparent storytelling.',
    },
    {
      label: 'CO2 saved this season',
      value: '1.8t',
      detail:
        'Compared with mass-produced alternatives across active catalogue items.',
    },
    {
      label: 'Average impact score',
      value: '92/100',
      detail:
        'Blends sourcing, packaging, durability, and regional delivery efficiency.',
    },
  ],
  categories: [
    {
      slug: 'tableware',
      name: 'Tableware',
      description:
        'Hand-thrown ceramics and reusable serving pieces for slow living.',
      materialFocus: 'Clay, plant-based glaze',
      impactHighlight: 'Local kiln partners cut shipping distance by 38%',
    },
    {
      slug: 'wearables',
      name: 'Wearables',
      description:
        'Repairable bags, scarves, and accessories made from deadstock textiles.',
      materialFocus: 'Organic cotton, reclaimed canvas',
      impactHighlight: 'Deadstock-first sourcing prevents landfill overflow',
    },
    {
      slug: 'home-objects',
      name: 'Home Objects',
      description:
        'Statement decor built from salvaged wood and natural fibers.',
      materialFocus: 'Recovered oak, jute, cork',
      impactHighlight: 'Durability scoring rewards long-life craftsmanship',
    },
  ],
  featuredProducts: [
    {
      id: 'prod-bloom-bowl',
      slug: 'bloom-bowl',
      name: 'Bloom Serving Bowl',
      artisanName: 'Noura Clay Studio',
      region: 'Tangier, Morocco',
      material: 'Recycled stoneware',
      price: 58,
      currency: 'USD',
      co2SavedKg: 5.6,
      impactScore: 95,
      storySnippet:
        'Thrown in small batches and fired with an energy-sharing kiln schedule.',
      imageHint: 'Terracotta bowl with speckled glaze',
    },
    {
      id: 'prod-cinder-tote',
      slug: 'cinder-tote',
      name: 'Cinder Market Tote',
      artisanName: 'Atelier Olive',
      region: 'Marseille, France',
      material: 'Deadstock canvas',
      price: 72,
      currency: 'USD',
      co2SavedKg: 3.8,
      impactScore: 91,
      storySnippet:
        'Cut from reclaimed sailcloth remnants and reinforced for daily carry.',
      imageHint: 'Structured olive canvas tote bag',
    },
    {
      id: 'prod-luna-lamp',
      slug: 'luna-lamp',
      name: 'Luna Reed Lamp',
      artisanName: 'Nile Loom Works',
      region: 'Aswan, Egypt',
      material: 'River reed and ash wood',
      price: 138,
      currency: 'USD',
      co2SavedKg: 9.4,
      impactScore: 96,
      storySnippet:
        'Woven over a lightweight ash frame finished with biodegradable oil.',
      imageHint: 'Warm woven lamp with organic shape',
    },
  ],
  artisans: [
    {
      id: 'artisan-noura',
      name: 'Noura Benali',
      studio: 'Noura Clay Studio',
      location: 'Tangier, Morocco',
      specialty: 'Small-batch ceramics',
      impactBadge: 'Kiln co-op partner',
      story:
        'Noura works with reclaimed clay offcuts and shares firing schedules with neighboring studios to reduce energy waste.',
    },
    {
      id: 'artisan-selene',
      name: 'Selene Marchand',
      studio: 'Atelier Olive',
      location: 'Marseille, France',
      specialty: 'Textile upcycling',
      impactBadge: 'Deadstock rescue leader',
      story:
        'Selene transforms marine canvas and unused garment rolls into repairable bags built to last for years.',
    },
    {
      id: 'artisan-khaled',
      name: 'Khaled Fares',
      studio: 'Nile Loom Works',
      location: 'Aswan, Egypt',
      specialty: 'Natural fiber lighting',
      impactBadge: 'Low-waste weaving',
      story:
        'Khaled partners with local reed harvesters and documents every material source inside the product impact passport.',
    },
  ],
  initiatives: [
    {
      title: 'Carbon-aware catalogue',
      summary:
        'Each listing carries a measurable impact score, material provenance, and estimated CO2 savings.',
      milestone: 'Sprint 2 foundation',
    },
    {
      title: 'Bundle builder',
      summary:
        'Shoppers will compose room-ready bundles and watch the shared packaging savings update in real time.',
      milestone: 'Sprint 3 target',
    },
    {
      title: 'Visual search',
      summary:
        'Customers will upload a photo and match similar products using embeddings stored in pgvector.',
      milestone: 'Sprint 4 differentiator',
    },
  ],
};
