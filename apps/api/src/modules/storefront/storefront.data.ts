import { StorefrontSnapshot } from './storefront.types';

export const storefrontSnapshot: StorefrontSnapshot = {
  hero: {
    eyebrow: 'Artisanat tunisien traceable',
    title:
      "La marketplace tunisienne ou chaque creation raconte son impact.",
    subtitle:
      'GreenCraft Tunisia rapproche les acheteurs attentifs et les artisans de Nabeul, Sousse, Tozeur et d ailleurs, autour de matieres revalorisees, durables et sourcees avec soin.',
    primaryCta: 'Explorer la collection',
    secondaryCta: 'Rencontrer les artisans',
  },
  metrics: [
    {
      label: 'Artisans verifies',
      value: '64',
      detail:
        'Ateliers verifies pour leur sourcing responsable et leur transparence.',
    },
    {
      label: 'CO2 economise cette saison',
      value: '1.8t',
      detail:
        'Compare aux alternatives industrielles sur les pieces actives du catalogue.',
    },
    {
      label: "Score d'impact moyen",
      value: '92/100',
      detail:
        'Prend en compte le sourcing, l emballage, la durabilite et l efficacite des livraisons.',
    },
  ],
  categories: [
    {
      slug: 'tableware',
      name: 'Art de la table',
      description:
        'Ceramiques tournees a la main et pieces de service reutilisables pour un quotidien plus lent.',
      materialFocus: 'Argile, email vegetal',
      impactHighlight: 'Les fours partenaires locaux reduisent la distance de transport de 38 %',
    },
    {
      slug: 'wearables',
      name: 'Accessoires textiles',
      description:
        'Sacs, echarpes et accessoires reparables confectionnes a partir de textiles revalorises.',
      materialFocus: 'Coton biologique, toile revalorisee',
      impactHighlight: 'Le recours aux stocks dormants evite des dechets supplementaires',
    },
    {
      slug: 'home-objects',
      name: 'Objets pour la maison',
      description:
        'Objets de decoration a forte presence, fabriques en bois recupere et fibres naturelles.',
      materialFocus: 'Chene recupere, jute, liege',
      impactHighlight: 'Le score de durabilite valorise les pieces concues pour durer longtemps',
    },
  ],
  featuredProducts: [
    {
      id: 'prod-bloom-bowl',
      slug: 'bloom-bowl',
      name: 'Bloom Serving Bowl',
      artisanName: 'Noura Clay Studio',
      region: 'Nabeul, Tunisia',
      material: 'Gres recycle',
      price: 58,
      currency: 'TND',
      co2SavedKg: 5.6,
      impactScore: 95,
      storySnippet:
        'Tournee en petite serie et cuite selon un planning de four mutualise entre ateliers.',
      imageUrl: null,
      imageAlt: 'Bloom Serving Bowl',
      imageHint: 'Bol terracotta a email mouchete',
    },
    {
      id: 'prod-cinder-tote',
      slug: 'cinder-tote',
      name: 'Cinder Market Tote',
      artisanName: 'Atelier Olive',
      region: 'Sousse, Tunisia',
      material: 'Toile revalorisee',
      price: 72,
      currency: 'TND',
      co2SavedKg: 3.8,
      impactScore: 91,
      storySnippet:
        'Decoupe dans des chutes de toile recuperee et renforcee pour un usage quotidien.',
      imageUrl: null,
      imageAlt: 'Cinder Market Tote',
      imageHint: 'Sac cabas structure en toile olive',
    },
    {
      id: 'prod-luna-lamp',
      slug: 'luna-lamp',
      name: 'Luna Reed Lamp',
      artisanName: 'Nile Loom Works',
      region: 'Tozeur, Tunisia',
      material: 'Roseau de riviere et frene',
      price: 138,
      currency: 'TND',
      co2SavedKg: 9.4,
      impactScore: 96,
      storySnippet:
        'Tissee sur une structure legere en frene et finie avec une huile biodegradable.',
      imageUrl: null,
      imageAlt: 'Luna Reed Lamp',
      imageHint: 'Lampe tissee aux lignes organiques',
    },
  ],
  artisans: [
    {
      id: 'artisan-noura',
      name: 'Noura Benali',
      studio: 'Noura Clay Studio',
      location: 'Nabeul, Tunisia',
      specialty: 'Ceramique en petite serie',
      impactBadge: 'Partenaire de four mutualise',
      story:
        'Noura travaille des chutes d argile recuperees et partage ses cuissons avec les ateliers voisins pour limiter la depense energetique.',
    },
    {
      id: 'artisan-selene',
      name: 'Selene Marchand',
      studio: 'Atelier Olive',
      location: 'Sousse, Tunisia',
      specialty: 'Upcycling textile',
      impactBadge: 'Specialiste des stocks dormants',
      story:
        'Selene transforme des toiles marines et des rouleaux inutilises en sacs reparables concus pour durer des annees.',
    },
    {
      id: 'artisan-khaled',
      name: 'Khaled Fares',
      studio: 'Nile Loom Works',
      location: 'Tozeur, Tunisia',
      specialty: 'Luminaires en fibres naturelles',
      impactBadge: 'Tissage faible dechet',
      story:
        'Khaled collabore avec des recolteurs de roseaux locaux et documente chaque origine de matiere dans le passeport produit.',
    },
  ],
  initiatives: [
    {
      title: 'Catalogue sensible au carbone',
      summary:
        'Chaque fiche affiche un score d impact mesurable, la provenance des matieres et une estimation du CO2 economise.',
      milestone: 'Base du produit',
    },
    {
      title: 'Composeur de lots',
      summary:
        'Les acheteurs composent des ensembles harmonieux et voient les economies d emballage evoluer en temps reel.',
      milestone: 'Parcours panier',
    },
    {
      title: 'Recherche visuelle',
      summary:
        'Les clients televersent une photo et retrouvent des produits similaires grace aux embeddings stockes dans pgvector.',
      milestone: 'Signature IA',
    },
  ],
};
