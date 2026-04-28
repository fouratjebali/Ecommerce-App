import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartResponse } from '../../models/cart';
import { CheckoutPayload } from '../../models/orders';
import { TndCurrencyPipe } from '../../pipes/tnd-currency.pipe';
import { AuthService } from '../../services/auth.service';
import { CartApiService } from '../../services/cart-api.service';
import { CheckoutDraftService } from '../../services/checkout-draft.service';
import { OrdersApiService } from '../../services/orders-api.service';

interface NoticeState {
  tone: 'error' | 'success';
  text: string;
}

type PaymentMethodId = 'visa' | 'mastercard' | 'paypal';

interface PaymentMethodOption {
  id: PaymentMethodId;
  label: string;
  hint: string;
  badge: string;
}

@Component({
  selector: 'app-payment-page',
  imports: [CommonModule, FormsModule, RouterLink, TndCurrencyPipe],
  templateUrl: './payment-page.html',
  styleUrl: './payment-page.scss',
})
export class PaymentPageComponent {
  private readonly authService = inject(AuthService);
  private readonly cartApiService = inject(CartApiService);
  private readonly checkoutDraftService = inject(CheckoutDraftService);
  private readonly ordersApiService = inject(OrdersApiService);
  private readonly router = inject(Router);

  protected readonly cart = signal<CartResponse | null>(null);
  protected readonly checkoutDraft = signal<CheckoutPayload | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly notice = signal<NoticeState | null>(null);
  protected readonly paymentMethods: PaymentMethodOption[] = [
    {
      id: 'visa',
      label: 'Visa',
      hint: 'Reglement par carte bancaire.',
      badge: 'Carte',
    },
    {
      id: 'mastercard',
      label: 'Mastercard',
      hint: 'Reglement par carte bancaire.',
      badge: 'Carte',
    },
    {
      id: 'paypal',
      label: 'PayPal',
      hint: 'Reglement avec votre compte PayPal.',
      badge: 'PayPal',
    },
  ];

  protected readonly paymentForm = {
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    securityCode: '',
    paymentMethod: 'visa' as PaymentMethodId,
    paypalEmail: '',
    billingCity: 'Tunis',
    acceptOrder: false,
  };

  constructor() {
    void this.loadPage();
  }

  protected choosePaymentMethod(method: PaymentMethodId) {
    this.paymentForm.paymentMethod = method;
  }

  protected usesCardFields() {
    return this.paymentForm.paymentMethod !== 'paypal';
  }

  protected selectedMethod() {
    return (
      this.paymentMethods.find(
        (method) => method.id === this.paymentForm.paymentMethod,
      ) ?? this.paymentMethods[0]
    );
  }

  protected submitLabel() {
    if (this.submitting()) {
      return 'Validation en cours...';
    }

    return this.usesCardFields() ? 'Valider la commande' : 'Continuer avec PayPal';
  }

  protected previewValue() {
    if (this.usesCardFields()) {
      return this.paymentForm.cardNumber || '•••• •••• •••• ••••';
    }

    return this.paymentForm.paypalEmail || 'compte@paypal.tn';
  }

  protected previewName() {
    if (this.usesCardFields()) {
      return this.paymentForm.cardholderName || this.checkoutDraft()?.shippingName || 'Titulaire';
    }

    return 'Portefeuille PayPal';
  }

  protected async submit() {
    const cart = this.cart();
    const checkoutDraft = this.checkoutDraft();

    if (!cart?.items.length || !checkoutDraft) {
      return;
    }

    if (!this.paymentForm.acceptOrder) {
      this.notice.set({
        tone: 'error',
        text: 'Veuillez confirmer votre commande avant de continuer.',
      });
      return;
    }

    this.submitting.set(true);
    this.notice.set(null);

    try {
      await firstValueFrom(this.ordersApiService.checkout(checkoutDraft));
      this.checkoutDraftService.clear();
      this.notice.set({
        tone: 'success',
        text: 'Votre commande a ete confirmee.',
      });
      await this.router.navigateByUrl('/orders');
    } catch {
      this.notice.set({
        tone: 'error',
        text: "La commande n'a pas pu etre finalisee. Verifiez votre panier puis reessayez.",
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

      const checkoutDraft = this.checkoutDraftService.load();

      if (!checkoutDraft) {
        await this.router.navigateByUrl('/checkout');
        return;
      }

      this.checkoutDraft.set(checkoutDraft);
      this.paymentForm.cardholderName = checkoutDraft.shippingName;
      this.paymentForm.paypalEmail = checkoutDraft.shippingEmail;
      this.paymentForm.billingCity = checkoutDraft.shippingCity;
      this.cart.set(await firstValueFrom(this.cartApiService.getCart()));

      if (!this.cart()?.items.length) {
        await this.router.navigateByUrl('/cart');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
