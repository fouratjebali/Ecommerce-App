import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BuyerOrder } from '../../models/orders';
import { MarketLabelPipe } from '../../pipes/market-label.pipe';
import { TndCurrencyPipe } from '../../pipes/tnd-currency.pipe';
import { OrdersApiService } from '../../services/orders-api.service';

interface NoticeState {
  tone: 'error';
  text: string;
}

@Component({
  selector: 'app-orders-page',
  imports: [CommonModule, RouterLink, DatePipe, TndCurrencyPipe, MarketLabelPipe],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss',
})
export class OrdersPageComponent {
  private readonly ordersApiService = inject(OrdersApiService);

  protected readonly orders = signal<BuyerOrder[]>([]);
  protected readonly loading = signal(true);
  protected readonly notice = signal<NoticeState | null>(null);
  protected readonly cancellingOrderNumber = signal<string | null>(null);

  constructor() {
    void this.loadOrders();
  }

  protected async cancelOrder(orderNumber: string) {
    this.cancellingOrderNumber.set(orderNumber);
    this.notice.set(null);

    try {
      await firstValueFrom(this.ordersApiService.cancelBuyerOrder(orderNumber));
      await this.loadOrders();
    } catch {
      this.notice.set({
        tone: 'error',
        text: "Cette commande n'a pas pu etre annulee depuis votre espace acheteur.",
      });
    } finally {
      this.cancellingOrderNumber.set(null);
    }
  }

  private async loadOrders() {
    this.loading.set(true);

    try {
      const response = await firstValueFrom(this.ordersApiService.getBuyerOrders());
      this.orders.set(response.items);
    } finally {
      this.loading.set(false);
    }
  }
}
