import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AdminDashboardResponse,
  AdminOrder,
  AdminProduct,
  AdminUser,
} from '../../models/admin';
import { MarketLabelPipe } from '../../pipes/market-label.pipe';
import { TndCurrencyPipe } from '../../pipes/tnd-currency.pipe';
import { AdminApiService } from '../../services/admin-api.service';

interface NoticeState {
  tone: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-admin-page',
  imports: [CommonModule, RouterLink, DatePipe, TndCurrencyPipe, MarketLabelPipe],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPageComponent implements OnDestroy {
  private readonly adminApiService = inject(AdminApiService);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly loading = signal(true);
  protected readonly refreshing = signal(false);
  protected readonly notice = signal<NoticeState | null>(null);
  protected readonly dashboard = signal<AdminDashboardResponse | null>(null);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly orders = signal<AdminOrder[]>([]);
  protected readonly products = signal<AdminProduct[]>([]);
  protected readonly updatingUserId = signal<string | null>(null);
  protected readonly updatingOrderNumber = signal<string | null>(null);
  protected readonly updatingProductId = signal<string | null>(null);

  constructor() {
    void this.loadAdminModule();
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  protected roleLabel(role: AdminUser['role']) {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur';
      case 'ARTISAN':
        return 'Artisan';
      default:
        return 'Acheteur';
    }
  }

  protected revenueTrend(snapshot: AdminDashboardResponse) {
    const current = snapshot.metrics.revenueLast7DaysInCents;
    const previous = snapshot.metrics.revenuePrevious7DaysInCents;

    if (!previous && current) {
      return '+100 %';
    }

    if (!previous) {
      return '0 %';
    }

    const delta = Math.round(((current - previous) / previous) * 100);
    return `${delta > 0 ? '+' : ''}${delta} %`;
  }

  protected inventoryTone(product: AdminProduct) {
    if (product.inventoryCount <= 1) {
      return 'critique';
    }

    if (product.inventoryCount <= 3) {
      return 'faible';
    }

    return 'stable';
  }

  protected async manualRefresh() {
    await this.loadAdminModule(false, true);
  }

  protected async promoteOrRestoreUser(user: AdminUser) {
    const nextRole =
      user.role === 'ADMIN' ? (user.artisanProfile ? 'ARTISAN' : 'BUYER') : 'ADMIN';

    await this.patchUser(user.id, {
      role: nextRole,
    });
  }

  protected async setVendorStatus(
    user: AdminUser,
    verificationStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED',
  ) {
    await this.patchUser(user.id, {
      verificationStatus,
    });
  }

  protected async toggleVerified(user: AdminUser) {
    await this.patchUser(user.id, {
      verified: !user.artisanProfile?.verified,
    });
  }

  protected async setOrderStatus(
    orderNumber: string,
    status: 'CONFIRMED' | 'FULFILLING' | 'COMPLETED' | 'CANCELLED',
  ) {
    this.updatingOrderNumber.set(orderNumber);
    this.notice.set(null);

    try {
      await firstValueFrom(this.adminApiService.updateOrderStatus(orderNumber, status));
      await Promise.all([this.loadOrders(), this.loadDashboard()]);
      this.notice.set({
        tone: 'success',
        text: 'La commande a ete mise a jour.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: "La commande n'a pas pu etre mise a jour.",
      });
    } finally {
      this.updatingOrderNumber.set(null);
    }
  }

  protected async setProductStatus(
    productId: string,
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  ) {
    this.updatingProductId.set(productId);
    this.notice.set(null);

    try {
      await firstValueFrom(this.adminApiService.updateProduct(productId, { status }));
      await Promise.all([this.loadProducts(), this.loadDashboard()]);
      this.notice.set({
        tone: 'success',
        text: 'Le statut du produit a ete mis a jour.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: "Le produit n'a pas pu etre mis a jour.",
      });
    } finally {
      this.updatingProductId.set(null);
    }
  }

  protected async toggleFeatured(product: AdminProduct) {
    this.updatingProductId.set(product.id);
    this.notice.set(null);

    try {
      await firstValueFrom(
        this.adminApiService.updateProduct(product.id, {
          isFeatured: !product.isFeatured,
        }),
      );
      await Promise.all([this.loadProducts(), this.loadDashboard()]);
      this.notice.set({
        tone: 'success',
        text: 'La mise en avant du produit a ete mise a jour.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: "La mise en avant du produit n'a pas pu etre modifiee.",
      });
    } finally {
      this.updatingProductId.set(null);
    }
  }

  private async loadAdminModule(initialLoad = true, manualRefresh = false) {
    if (initialLoad) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }

    if (manualRefresh) {
      this.notice.set(null);
    }

    try {
      await Promise.all([
        this.loadDashboard(),
        this.loadUsers(),
        this.loadOrders(),
        this.loadProducts(),
      ]);

      if (manualRefresh) {
        this.notice.set({
          tone: 'success',
          text: 'Le tableau de bord a ete actualise.',
        });
      }
    } catch {
      this.notice.set({
        tone: 'error',
        text: "Le module administrateur n'a pas pu etre charge pour le moment.",
      });
    } finally {
      this.loading.set(false);
      this.refreshing.set(false);
    }
  }

  private async loadDashboard() {
    const response = await firstValueFrom(this.adminApiService.getDashboard());
    this.dashboard.set(response);
    this.configureAutoRefresh(response.refreshIntervalMs);
  }

  private async loadUsers() {
    const response = await firstValueFrom(this.adminApiService.getUsers());
    this.users.set(response.items);
  }

  private async loadOrders() {
    const response = await firstValueFrom(this.adminApiService.getOrders());
    this.orders.set(response.items);
  }

  private async loadProducts() {
    const response = await firstValueFrom(this.adminApiService.getProducts());
    this.products.set(response.items);
  }

  private configureAutoRefresh(intervalMs: number) {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      void this.loadAdminModule(false);
    }, intervalMs);
  }

  private async patchUser(
    userId: string,
    payload: {
      role?: 'ADMIN' | 'ARTISAN' | 'BUYER';
      verificationStatus?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
      verified?: boolean;
    },
  ) {
    this.updatingUserId.set(userId);
    this.notice.set(null);

    try {
      await firstValueFrom(this.adminApiService.updateUser(userId, payload));
      await Promise.all([this.loadUsers(), this.loadDashboard()]);
      this.notice.set({
        tone: 'success',
        text: "Le profil utilisateur a ete mis a jour.",
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: "La mise a jour de l'utilisateur a echoue.",
      });
    } finally {
      this.updatingUserId.set(null);
    }
  }
}
