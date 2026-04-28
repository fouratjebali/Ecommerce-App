export interface AdminDashboardResponse {
  generatedAt: string;
  refreshIntervalMs: number;
  metrics: {
    totalRevenueInCents: number;
    revenueLast7DaysInCents: number;
    revenuePrevious7DaysInCents: number;
    totalOrders: number;
    ordersLast7Days: number;
    totalUsers: number;
    totalBuyers: number;
    activeArtisans: number;
    publishedProducts: number;
    lowStockProducts: number;
    pendingVendorReviews: number;
    cancelledOrders: number;
  };
  performance: {
    averageOrderValueInCents: number;
    fulfillmentRate: number;
    statusBreakdown: Array<{ status: string; count: number }>;
    topCategories: Array<{
      slug: string;
      name: string;
      itemsSold: number;
      revenueInCents: number;
    }>;
    topArtisans: Array<{
      id: string;
      studioName: string;
      location: string;
      verified: boolean;
      itemsSold: number;
      revenueInCents: number;
    }>;
  };
  alerts: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    count: number;
    actionTarget: 'users' | 'orders' | 'products';
  }>;
  recentOrders: AdminOrder[];
  recentUsers: AdminUser[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'ARTISAN' | 'BUYER';
  avatarUrl: string | null;
  createdAt: string;
  orderCount: number;
  totalSpentInCents: number;
  canManageRole: boolean;
  artisanProfile: {
    id: string;
    slug: string;
    studioName: string;
    verificationStatus: string;
    verified: boolean;
    location: string;
  } | null;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalInCents: number;
  currency: string;
  itemCount: number;
  vendorCount: number;
  placedAt: string;
  shippingCity: string;
  shippingCountry: string;
  buyer: {
    id: string;
    fullName: string;
    email: string;
  };
  items: Array<{
    id: string;
    status: string;
    quantity: number;
    productName: string;
    artisanStudioName: string;
  }>;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  status: string;
  isFeatured: boolean;
  inventoryCount: number;
  priceInCents: number;
  currency: string;
  impactScore: number;
  updatedAt: string;
  imageUrl: string | null;
  imageAlt: string;
  orderItemCount: number;
  artisan: {
    id: string;
    studioName: string;
    location: string;
    verificationStatus: string;
    verified: boolean;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface AdminUsersResponse {
  items: AdminUser[];
}

export interface AdminOrdersResponse {
  items: AdminOrder[];
}

export interface AdminProductsResponse {
  items: AdminProduct[];
}
