import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartResponse } from '../../models/cart';
import { TndCurrencyPipe } from '../../pipes/tnd-currency.pipe';
import { AuthService } from '../../services/auth.service';
import { CartApiService } from '../../services/cart-api.service';

interface NoticeState {
  tone: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-cart-page',
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, TndCurrencyPipe],
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
        text: 'La quantite du panier n a pas pu etre mise a jour.',
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
        text: "L'article n'a pas pu etre retire du panier.",
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
        text: 'Le code promo a ete applique a votre selection.',
      });
    } catch {
      this.notice.set({
        tone: 'error',
        text: "Ce code promo n'est pas valable pour ce panier.",
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
        text: "Le code promo n'a pas pu etre retire.",
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
