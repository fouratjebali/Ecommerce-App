const MARKET_LABELS: Record<string, string> = {
  'Tableware': 'Art de la table',
  'Bags & Accessories': 'Sacs et accessoires',
  'Lighting & Decor': 'Luminaires et deco',
  Wearables: 'Accessoires textiles',
  'Home Objects': 'Objets pour la maison',
  'Earth Positive': 'Impact exemplaire',
  'Closed Loop': 'Boucle fermee',
  'Mindful Standard': 'Standard responsable',
  'Color Family': 'Famille de couleurs',
  Room: 'Piece',
  'Made to Order': 'Fabrique a la commande',
  Visual: 'Visuel',
  Lifestyle: 'Mode de vie',
  Availability: 'Disponibilite',
  Terracotta: 'Terracotta',
  Olive: 'Olive',
  Sand: 'Sable',
  Natural: 'Naturel',
  Kitchen: 'Cuisine',
  'Living Room': 'Salon',
  Entryway: 'Entree',
  'Recycled Stoneware': 'Gres recycle',
  'Deadstock Canvas': 'Toile revalorisee',
  'River Reed': 'Roseau de riviere',
  'Salvaged Oak': 'Chene recupere',
  'Organic Cotton': 'Coton biologique',
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publie',
  ARCHIVED: 'Archive',
  PENDING: 'En attente',
  ACTIVE: 'Actif',
  CONFIRMED: 'Confirme',
  FULFILLING: 'En preparation',
  COMPLETED: 'Termine',
  CANCELLED: 'Annule',
  SHIPPED: 'Expedie',
};

export function translateMarketLabel(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return MARKET_LABELS[value] ?? value;
}
