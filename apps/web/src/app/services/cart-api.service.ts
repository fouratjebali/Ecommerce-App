import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApplyCouponPayload, CartResponse } from '../models/cart';
import { CartSessionService } from './cart-session.service';

@Injectable({ providedIn: 'root' })
export class CartApiService {
  private readonly http = inject(HttpClient);
  private readonly cartSessionService = inject(CartSessionService);

  getCart() {
    return this.http.get<CartResponse>('/api/v1/cart', {
      headers: this.createHeaders(),
    });
  }

  addItem(productId: string, quantity: number) {
    return this.http.post<CartResponse>(
      '/api/v1/cart/items',
      {
        productId,
        quantity,
      },
      {
        headers: this.createHeaders(),
      },
    );
  }

  updateItemQuantity(productId: string, quantity: number) {
    return this.http.patch<CartResponse>(
      `/api/v1/cart/items/${productId}`,
      {
        quantity,
      },
      {
        headers: this.createHeaders(),
      },
    );
  }

  removeItem(productId: string) {
    return this.http.delete<CartResponse>(`/api/v1/cart/items/${productId}`, {
      headers: this.createHeaders(),
    });
  }

  applyCoupon(payload: ApplyCouponPayload) {
    return this.http.post<CartResponse>('/api/v1/cart/coupons/apply', payload, {
      headers: this.createHeaders(),
    });
  }

  clearCoupon() {
    return this.http.delete<CartResponse>('/api/v1/cart/coupons', {
      headers: this.createHeaders(),
    });
  }

  clearCart() {
    return this.http.delete<CartResponse>('/api/v1/cart', {
      headers: this.createHeaders(),
    });
  }

  getSessionId() {
    return this.cartSessionService.getSessionId();
  }

  private createHeaders() {
    return new HttpHeaders({
      'x-cart-session': this.cartSessionService.getSessionId(),
    });
  }
}
