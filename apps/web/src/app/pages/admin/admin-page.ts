import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

type AdminSection = 'dashboard' | 'users' | 'orders' | 'products';
type UserRoleFilter = 'ALL' | AdminUser['role'];
type VendorStatusFilter = 'ALL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED';
type OrderStatusFilter = 'ALL' | 'CONFIRMED' | 'FULFILLING' | 'COMPLETED' | 'CANCELLED';
type ProductStatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type FeaturedFilter = 'ALL' | 'FEATURED' | 'STANDARD';

@Component({
  selector: 'app-admin-page',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    TndCurrencyPipe,
    MarketLabelPipe,
  ],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPageComponent implements OnDestroy {
  private readonly adminApiService = inject(AdminApiService);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly activeSection = signal<AdminSection>('dashboard');
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

  protected readonly usersQuery = signal('');
  protected readonly ordersQuery = signal('');
  protected readonly productsQuery = signal('');
  protected readonly userRoleFilter = signal<UserRoleFilter>('ALL');
  protected readonly vendorStatusFilter = signal<VendorStatusFilter>('ALL');
  protected readonly orderStatusFilter = signal<OrderStatusFilter>('ALL');
  protected readonly productStatusFilter = signal<ProductStatusFilter>('ALL');
  protected readonly featuredFilter = signal<FeaturedFilter>('ALL');

  protected readonly sectionItems = computed(() => {
    const snapshot = this.dashboard();

    return [
      {
        id: 'dashboard' as const,
        label: 'Tableau de bord',
        helper: 'Vue globale et analyses',
        count: snapshot ? snapshot.alerts.length : 0,
        countLabel: 'alertes',
      },
      {
        id: 'users' as const,
        label: 'Utilisateurs',
        helper: 'Roles et statuts d atelier',
        count: this.users().length,
        countLabel: 'comptes',
      },
      {
        id: 'orders' as const,
        label: 'Commandes',
        helper: 'Suivi et interventions',
        count: this.orders().length,
        countLabel: 'commandes',
      },
      {
        id: 'products' as const,
        label: 'Catalogue',
        helper: 'Moderation et mise en avant',
        count: this.products().length,
        countLabel: 'produits',
      },
    ];
  });

  protected readonly filteredUsers = computed(() => {
    const query = this.usersQuery().trim().toLowerCase();
    const roleFilter = this.userRoleFilter();
    const vendorStatusFilter = this.vendorStatusFilter();

    return this.users().filter((user) => {
      if (roleFilter !== 'ALL' && user.role !== roleFilter) {
        return false;
      }

      if (
        vendorStatusFilter !== 'ALL' &&
        user.artisanProfile?.verificationStatus !== vendorStatusFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        user.fullName,
        user.email,
        user.artisanProfile?.studioName ?? '',
        user.artisanProfile?.location ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  protected readonly filteredOrders = computed(() => {
    const query = this.ordersQuery().trim().toLowerCase();
    const statusFilter = this.orderStatusFilter();

    return this.orders().filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        order.orderNumber,
        order.buyer.fullName,
        order.buyer.email,
        order.shippingCity,
        order.shippingCountry,
        ...order.items.map((item) => item.productName),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  protected readonly filteredProducts = computed(() => {
    const query = this.productsQuery().trim().toLowerCase();
    const statusFilter = this.productStatusFilter();
    const featuredFilter = this.featuredFilter();

    return this.products().filter((product) => {
      if (statusFilter !== 'ALL' && product.status !== statusFilter) {
        return false;
      }

      if (
        featuredFilter === 'FEATURED' &&
        !product.isFeatured
      ) {
        return false;
      }

      if (
        featuredFilter === 'STANDARD' &&
        product.isFeatured
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        product.name,
        product.slug,
        product.artisan.studioName,
        product.artisan.location,
        product.category.name,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  protected readonly revenueBars = computed(() => {
    const snapshot = this.dashboard();

    if (!snapshot) {
      return [];
    }

    const bars = [
      {
        label: '7 derniers jours',
        hint: 'Periode actuelle',
        value: snapshot.metrics.revenueLast7DaysInCents,
        tone: 'primary',
      },
      {
        label: '7 jours precedents',
        hint: 'Periode de comparaison',
        value: snapshot.metrics.revenuePrevious7DaysInCents,
        tone: 'secondary',
      },
    ] as const;

    const max = Math.max(...bars.map((bar) => bar.value), 1);

    return bars.map((bar) => ({
      ...bar,
      width: bar.value > 0 ? `${Math.max((bar.value / max) * 100, 10)}%` : '0%',
    }));
  });

  protected readonly statusBars = computed(() => {
    const snapshot = this.dashboard();

    if (!snapshot) {
      return [];
    }

    const total = snapshot.performance.statusBreakdown.reduce(
      (sum, entry) => sum + entry.count,
      0,
    );

    return snapshot.performance.statusBreakdown.map((entry) => ({
      ...entry,
      share: total > 0 ? Math.round((entry.count / total) * 100) : 0,
      width: total > 0 ? `${Math.max((entry.count / total) * 100, 8)}%` : '0%',
    }));
  });

  protected readonly categoryBars = computed(() => {
    const snapshot = this.dashboard();

    if (!snapshot) {
      return [];
    }

    const max = Math.max(
      ...snapshot.performance.topCategories.map((category) => category.revenueInCents),
      1,
    );

    return snapshot.performance.topCategories.map((category) => ({
      ...category,
      width:
        category.revenueInCents > 0
          ? `${Math.max((category.revenueInCents / max) * 100, 12)}%`
          : '0%',
    }));
  });

  protected readonly artisanBars = computed(() => {
    const snapshot = this.dashboard();

    if (!snapshot) {
      return [];
    }

    const max = Math.max(
      ...snapshot.performance.topArtisans.map((artisan) => artisan.revenueInCents),
      1,
    );

    return snapshot.performance.topArtisans.map((artisan) => ({
      ...artisan,
      width:
        artisan.revenueInCents > 0
          ? `${Math.max((artisan.revenueInCents / max) * 100, 12)}%`
          : '0%',
    }));
  });

  protected readonly lowStockProducts = computed(() =>
    this.products()
      .filter((product) => product.inventoryCount <= 3)
      .sort((left, right) => left.inventoryCount - right.inventoryCount)
      .slice(0, 5),
  );

  constructor() {
    void this.loadAdminModule();
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  protected setSection(section: AdminSection) {
    this.activeSection.set(section);
  }

  protected openAlertTarget(target: 'users' | 'orders' | 'products') {
    this.activeSection.set(target);
  }

  protected alertActionLabel(target: 'users' | 'orders' | 'products') {
    switch (target) {
      case 'users':
        return 'Ouvrir les utilisateurs';
      case 'orders':
        return 'Ouvrir les commandes';
      default:
        return 'Ouvrir le catalogue';
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
