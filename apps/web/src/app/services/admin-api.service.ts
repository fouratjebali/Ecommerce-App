import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AdminDashboardResponse,
  AdminOrdersResponse,
  AdminProductsResponse,
  AdminUsersResponse,
} from '../models/admin';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  getDashboard() {
    return this.http.get<AdminDashboardResponse>('/api/v1/admin/dashboard');
  }

  getUsers() {
    return this.http.get<AdminUsersResponse>('/api/v1/admin/users');
  }

  updateUser(
    userId: string,
    payload: {
      role?: 'ADMIN' | 'ARTISAN' | 'BUYER';
      verificationStatus?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
      verified?: boolean;
    },
  ) {
    return this.http.patch<{ user: AdminUsersResponse['items'][number] }>(
      `/api/v1/admin/users/${userId}`,
      payload,
    );
  }

  getOrders() {
    return this.http.get<AdminOrdersResponse>('/api/v1/admin/orders');
  }

  updateOrderStatus(orderNumber: string, status: string) {
    return this.http.patch<{ order: AdminOrdersResponse['items'][number] }>(
      `/api/v1/admin/orders/${orderNumber}/status`,
      { status },
    );
  }

  getProducts() {
    return this.http.get<AdminProductsResponse>('/api/v1/admin/products');
  }

  updateProduct(
    productId: string,
    payload: {
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      isFeatured?: boolean;
    },
  ) {
    return this.http.patch<{ product: AdminProductsResponse['items'][number] }>(
      `/api/v1/admin/products/${productId}`,
      payload,
    );
  }
}
