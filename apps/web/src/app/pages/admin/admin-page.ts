import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Chart,
  ChartData,
  ChartOptions,
  TooltipItem,
  registerables,
} from 'chart.js';
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

Chart.register(...registerables);

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
  private readonly workspaceAnchor = viewChild<ElementRef<HTMLElement>>('workspaceAnchor');
  private readonly revenueChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('revenueChartCanvas');
  private readonly statusChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('statusChartCanvas');
  private readonly categoryChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('categoryChartCanvas');
  private readonly artisanChartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('artisanChartCanvas');
  private revenueChart: Chart<'bar'> | null = null;
  private statusChart: Chart<'doughnut'> | null = null;
  private categoryChart: Chart<'bar'> | null = null;
  private artisanChart: Chart<'bar'> | null = null;
  private readonly chartPalette = {
    forest: '#546B41',
    olive: '#99AD7A',
    parchment: '#FFF8EC',
    sand: '#DCCCAC',
    terracotta: '#B65F3A',
    walnut: '#3A2415',
    muted: 'rgba(58, 36, 21, 0.72)',
    line: 'rgba(84, 107, 65, 0.14)',
  } as const;

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

  protected readonly revenueComparisonData = computed<ChartData<'bar'>>(() => {
    const snapshot = this.dashboard();

    return {
      labels: ['7 derniers jours', '7 jours precedents'],
      datasets: [
        {
          label: "Chiffre d'affaires",
          data: snapshot
            ? [
                snapshot.metrics.revenueLast7DaysInCents / 100,
                snapshot.metrics.revenuePrevious7DaysInCents / 100,
              ]
            : [0, 0],
          backgroundColor: [this.chartPalette.forest, this.chartPalette.sand],
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 58,
        },
      ],
    };
  });

  protected readonly statusDistributionData = computed<ChartData<'doughnut'>>(() => {
    const snapshot = this.dashboard();
    const entries = snapshot?.performance.statusBreakdown ?? [];

    return {
      labels: entries.map((entry) => this.translateStatus(entry.status)),
      datasets: [
        {
          data: entries.map((entry) => entry.count),
          backgroundColor: [
            this.chartPalette.forest,
            this.chartPalette.olive,
            this.chartPalette.sand,
            this.chartPalette.terracotta,
            '#7f8c5d',
          ],
          borderColor: this.chartPalette.parchment,
          borderWidth: 4,
          hoverOffset: 6,
        },
      ],
    };
  });

  protected readonly categoryPerformanceData = computed<ChartData<'bar'>>(() => {
    const snapshot = this.dashboard();
    const entries = snapshot?.performance.topCategories ?? [];

    return {
      labels: entries.map((entry) => entry.name),
      datasets: [
        {
          label: "Chiffre d'affaires",
          data: entries.map((entry) => entry.revenueInCents / 100),
          backgroundColor: this.chartPalette.sand,
          borderColor: this.chartPalette.forest,
          borderWidth: 1,
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    };
  });

  protected readonly artisanPerformanceData = computed<ChartData<'bar'>>(() => {
    const snapshot = this.dashboard();
    const entries = snapshot?.performance.topArtisans ?? [];

    return {
      labels: entries.map((entry) => entry.studioName),
      datasets: [
        {
          label: 'Ventes',
          data: entries.map((entry) => entry.itemsSold),
          backgroundColor: this.chartPalette.olive,
          borderRadius: 10,
          borderSkipped: false,
        },
        {
          label: 'CA en TND',
          data: entries.map((entry) => Math.round(entry.revenueInCents / 100)),
          backgroundColor: this.chartPalette.forest,
          borderRadius: 10,
          borderSkipped: false,
        },
      ],
    };
  });

  protected readonly revenueChartOptions: ChartOptions<'bar'> = this.createBarChartOptions({
    indexAxis: 'x',
    tooltipLabel: (item) => this.formatCurrencyValue(item.parsed.y ?? 0),
  });

  protected readonly categoryChartOptions: ChartOptions<'bar'> = this.createBarChartOptions({
    indexAxis: 'y',
    tooltipLabel: (item) => this.formatCurrencyValue(item.parsed.x ?? 0),
  });

  protected readonly artisanChartOptions: ChartOptions<'bar'> = this.createBarChartOptions({
    indexAxis: 'y',
    stacked: false,
    tooltipLabel: (item) =>
      item.dataset.label === 'CA en TND'
        ? this.formatCurrencyValue(item.parsed.x ?? 0)
        : `${item.dataset.label}: ${item.parsed.x ?? 0}`,
  });

  protected readonly doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '64%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: this.chartPalette.muted,
          usePointStyle: true,
          boxWidth: 10,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (item) => `${item.label}: ${item.raw ?? 0}`,
        },
      },
    },
  };

  protected readonly lowStockProducts = computed(() =>
    this.products()
      .filter((product) => product.inventoryCount <= 3)
      .sort((left, right) => left.inventoryCount - right.inventoryCount)
      .slice(0, 5),
  );

  private readonly chartSyncEffect = effect((onCleanup) => {
    onCleanup(() => this.destroyCharts());

    const snapshot = this.dashboard();
    const revenueCanvas = this.revenueChartCanvas();
    const statusCanvas = this.statusChartCanvas();
    const categoryCanvas = this.categoryChartCanvas();
    const artisanCanvas = this.artisanChartCanvas();

    if (!snapshot || !revenueCanvas || !statusCanvas || !categoryCanvas || !artisanCanvas) {
      return;
    }

    this.revenueChart = this.renderBarChart(
      this.revenueChart,
      revenueCanvas,
      this.revenueComparisonData(),
      this.revenueChartOptions,
    );
    this.statusChart = this.renderDoughnutChart(
      this.statusChart,
      statusCanvas,
      this.statusDistributionData(),
      this.doughnutChartOptions,
    );
    this.categoryChart = this.renderBarChart(
      this.categoryChart,
      categoryCanvas,
      this.categoryPerformanceData(),
      this.categoryChartOptions,
    );
    this.artisanChart = this.renderBarChart(
      this.artisanChart,
      artisanCanvas,
      this.artisanPerformanceData(),
      this.artisanChartOptions,
    );
  });

  constructor() {
    void this.loadAdminModule();
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  protected setSection(section: AdminSection) {
    const sectionWasAlreadyActive = this.activeSection() === section;
    this.activeSection.set(section);

    queueMicrotask(() => {
      this.workspaceAnchor()?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    if (sectionWasAlreadyActive && section === 'dashboard') {
      this.notice.set({
        tone: 'success',
        text: 'Vous etes deja sur le tableau de bord.',
      });
    }
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

  protected translateStatus(status: string) {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirme';
      case 'FULFILLING':
        return 'En preparation';
      case 'COMPLETED':
        return 'Termine';
      case 'CANCELLED':
        return 'Annule';
      default:
        return status;
    }
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

  private renderBarChart(
    currentChart: Chart<'bar'> | null,
    canvasRef: ElementRef<HTMLCanvasElement>,
    data: ChartData<'bar'>,
    options: ChartOptions<'bar'>,
  ) {
    currentChart?.destroy();

    return new Chart(canvasRef.nativeElement, {
      type: 'bar',
      data,
      options,
    });
  }

  private renderDoughnutChart(
    currentChart: Chart<'doughnut'> | null,
    canvasRef: ElementRef<HTMLCanvasElement>,
    data: ChartData<'doughnut'>,
    options: ChartOptions<'doughnut'>,
  ) {
    currentChart?.destroy();

    return new Chart(canvasRef.nativeElement, {
      type: 'doughnut',
      data,
      options,
    });
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

  private createBarChartOptions(
    config: {
      indexAxis: 'x' | 'y';
      stacked?: boolean;
      tooltipLabel: (item: TooltipItem<'bar'>) => string;
    },
  ): ChartOptions<'bar'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: config.indexAxis,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      scales: {
        x: {
          stacked: config.stacked,
          grid: {
            color: this.chartPalette.line,
          },
          ticks: {
            color: this.chartPalette.muted,
          },
          border: {
            display: false,
          },
        },
        y: {
          stacked: config.stacked,
          grid: {
            color: this.chartPalette.line,
          },
          ticks: {
            color: this.chartPalette.muted,
          },
          border: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: this.chartPalette.muted,
            usePointStyle: true,
            boxWidth: 10,
            padding: 16,
          },
        },
        tooltip: {
          callbacks: {
            label: config.tooltipLabel,
          },
        },
      },
    };
  }

  private formatCurrencyValue(value: number) {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
    }).format(value);
  }

  private destroyCharts() {
    this.revenueChart?.destroy();
    this.statusChart?.destroy();
    this.categoryChart?.destroy();
    this.artisanChart?.destroy();

    this.revenueChart = null;
    this.statusChart = null;
    this.categoryChart = null;
    this.artisanChart = null;
  }
}
