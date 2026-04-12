import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartResponse } from '../../models/cart';
import { AuthService } from '../../services/auth.service';
import { CartApiService } from '../../services/cart-api.service';

interface NoticeState {
  tone: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-cart-page',
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
})
export class CartPageComponent {
  protected readonly authService = inject(AuthService);

  private readonly cartApiService = inject(CartApiService);

  protected readonly cart = signal<CartResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly applyingCoupon = signal(false);
  protected readonly updatingProductId = signal<string | null>(null);
  protected readonly notice = signal<NoticeState | null>(null);

  protected couponCode = '';

  constructor() {
    void this.loadCart();
  }

  protected async increment(productId: string, quantity: number) {
    await this.updateQuantity(productId, quantity + 1);
  }

  protected async decrement(productId: string, quantity: number) {
    await this.updateQuantity(productId, Math.max(quantity - 1, 0));
  }

  protected async updateQuantity(productId: string, nextQuantity: number) {
    this.updatingProductId.set(productId);
    this.notice.set(null);

    try {
      this.cart.set(
        await firstValueFrom(
          this.cartApiService.updateItemQuantity(productId, nextQuantity),
        ),
      );
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'The cart quantity could not be updated.',
      });
    } finally {
      this.updatingProductId.set(null);
    }
  }

  protected async removeItem(productId: string) {
    this.updatingProductId.set(productId);
    this.notice.set(null);

    try {
      this.cart.set(await firstValueFrom(this.cartApiService.removeItem(productId)));
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'The cart item could not be removed.',
      });
    } finally {
      this.updatingProductId.set(null);
    }
  }

  protected async applyCoupon() {
    if (!this.couponCode.trim()) {
      return;
    }

    this.applyingCoupon.set(true);
    this.notice.set(null);

    try {
      this.cart.set(
        await firstValueFrom(
          this.cartApiService.applyCoupon({
            code: this.couponCode.trim(),
          }),
        ),
      );
      this.notice.set({
        tone: 'success',
        text: 'Coupon applied to the current bundle.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'That coupon is not valid for the current cart.',
      });
    } finally {
      this.applyingCoupon.set(false);
    }
  }

  protected async clearCoupon() {
    this.notice.set(null);

    try {
      this.cart.set(await firstValueFrom(this.cartApiService.clearCoupon()));
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'The coupon could not be removed.',
      });
    }
  }

  private async loadCart() {
    this.loading.set(true);

    try {
      this.cart.set(await firstValueFrom(this.cartApiService.getCart()));
    } finally {
      this.loading.set(false);
    }
  }
}
