export interface VendorProfileResponse {
  profile: {
    id: string;
    slug: string;
    studioName: string;
    headline: string;
    bio: string;
    location: string;
    impactStatement: string;
    verificationStatus: string;
    verified: boolean;
    responseRate: number;
    averageRating: number;
    totalSales: number;
  };
}

export interface VendorDashboardResponse {
  profile: VendorProfileResponse['profile'];
  metrics: {
    totalProducts: number;
    publishedProducts: number;
    draftProducts: number;
    totalInventory: number;
    averageImpactScore: number;
    totalCo2SavedKg: number;
  };
  topMaterials: Array<{ name: string; count: number }>;
  latestProducts: Array<{
    id: string;
    name: string;
    status: string;
    inventoryCount: number;
    impactScore: number;
  }>;
}

export interface VendorProfilePayload {
  studioName?: string;
  headline?: string;
  bio?: string;
  location?: string;
  impactStatement?: string;
}
