import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartResponse } from '../../models/cart';
import { AuthService } from '../../services/auth.service';
import { CartApiService } from '../../services/cart-api.service';
import { OrdersApiService } from '../../services/orders-api.service';

interface NoticeState {
  tone: 'error';
  text: string;
}

@Component({
  selector: 'app-checkout-page',
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPageComponent {
  private readonly authService = inject(AuthService);
  private readonly cartApiService = inject(CartApiService);
  private readonly ordersApiService = inject(OrdersApiService);
  private readonly router = inject(Router);

  protected readonly cart = signal<CartResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly notice = signal<NoticeState | null>(null);

  protected readonly form = {
    shippingName: '',
    shippingEmail: '',
    shippingAddressLine1: '',
    shippingAddressLine2: '',
    shippingCity: '',
    shippingPostalCode: '',
    shippingCountry: 'Tunisia',
    notes: '',
  };

  constructor() {
    void this.loadPage();
  }

  protected async submit() {
    if (!this.cart()?.items.length) {
      return;
    }

    this.submitting.set(true);
    this.notice.set(null);

    try {
      await firstValueFrom(this.ordersApiService.checkout(this.form));
      await this.router.navigateByUrl('/orders');
    } catch {
      this.notice.set({
        tone: 'error',
        text: 'Checkout could not be completed. Verify the buyer session and cart reservations.',
      });
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadPage() {
    this.loading.set(true);

    try {
      const user = await this.authService.ensureProfile();

      if (!user || user.role !== 'BUYER') {
        await this.router.navigateByUrl('/auth');
        return;
      }

      this.form.shippingName = user.fullName;
      this.form.shippingEmail = user.email;
      this.cart.set(await firstValueFrom(this.cartApiService.getCart()));
    } finally {
      this.loading.set(false);
    }
  }
}
