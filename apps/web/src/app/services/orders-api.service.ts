import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BuyerOrderResponse,
  BuyerOrdersResponse,
  CheckoutPayload,
  VendorOrderItemsResponse,
} from '../models/orders';
import { CartSessionService } from './cart-session.service';

@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly cartSessionService = inject(CartSessionService);

  getBuyerOrders() {
    return this.http.get<BuyerOrdersResponse>('/api/v1/orders');
  }

  getBuyerOrder(orderNumber: string) {
    return this.http.get<BuyerOrderResponse>(`/api/v1/orders/${orderNumber}`);
  }

  checkout(payload: CheckoutPayload) {
    return this.http.post<BuyerOrderResponse>(
      '/api/v1/orders/checkout',
      payload,
      {
        headers: this.createCartHeaders(),
      },
    );
  }

  cancelBuyerOrder(orderNumber: string) {
    return this.http.post<BuyerOrderResponse>(
      `/api/v1/orders/${orderNumber}/cancel`,
      {},
    );
  }

  getVendorOrderItems() {
    return this.http.get<VendorOrderItemsResponse>('/api/v1/orders/vendor/items');
  }

  updateVendorOrderItemStatus(itemId: string, status: string) {
    return this.http.patch<{ item: { id: string; status: string } }>(
      `/api/v1/orders/vendor/items/${itemId}/status`,
      {
        status,
      },
    );
  }

  private createCartHeaders() {
    return new HttpHeaders({
      'x-cart-session': this.cartSessionService.getSessionId(),
    });
  }
}
