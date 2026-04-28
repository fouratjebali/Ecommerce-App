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
  testValue: string;
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
      hint: 'Carte de test classique pour le parcours principal.',
      badge: 'Carte',
      testValue: '4242 4242 4242 4242',
    },
    {
      id: 'mastercard',
      label: 'Mastercard',
      hint: 'Alternative de carte pour varier la simulation de paiement.',
      badge: 'Carte',
      testValue: '5555 5555 5555 4444',
    },
    {
      id: 'paypal',
      label: 'PayPal',
      hint: 'Portefeuille simule avec validation fictive en fin de parcours.',
      badge: 'Wallet',
      testValue: 'sandbox@paypal.tn',
    },
  ];

  protected readonly paymentForm = {
    cardholderName: '',
    cardNumber: '4242 4242 4242 4242',
    expiryMonth: '12',
    expiryYear: '2028',
    securityCode: '123',
    paymentMethod: 'visa' as PaymentMethodId,
    paypalEmail: 'sandbox@paypal.tn',
    billingCity: 'Tunis',
    acceptSimulation: false,
  };

  constructor() {
    void this.loadPage();
  }

  protected choosePaymentMethod(method: PaymentMethodId) {
    this.paymentForm.paymentMethod = method;

    if (method === 'visa') {
      this.paymentForm.cardNumber = '4242 4242 4242 4242';
      return;
    }

    if (method === 'mastercard') {
      this.paymentForm.cardNumber = '5555 5555 5555 4444';
      return;
    }

    if (!this.paymentForm.paypalEmail) {
      this.paymentForm.paypalEmail = 'sandbox@paypal.tn';
    }
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
      return this.usesCardFields()
        ? 'Traitement de la simulation...'
        : 'Connexion PayPal fictive...';
    }

    return this.usesCardFields() ? 'Payer' : 'Continuer avec PayPal';
  }

  protected previewValue() {
    if (this.usesCardFields()) {
      return this.paymentForm.cardNumber || '4242 4242 4242 4242';
    }

    return this.paymentForm.paypalEmail || 'sandbox@paypal.tn';
  }

  protected previewName() {
    if (this.usesCardFields()) {
      return this.paymentForm.cardholderName || this.checkoutDraft()?.shippingName || 'Titulaire';
    }

    return 'Portefeuille sandbox';
  }

  protected async submit() {
    const cart = this.cart();
    const checkoutDraft = this.checkoutDraft();

    if (!cart?.items.length || !checkoutDraft) {
      return;
    }

    if (!this.paymentForm.acceptSimulation) {
      this.notice.set({
        tone: 'error',
        text: 'Veuillez confirmer que vous comprenez qu il s agit d un paiement simule.',
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
        text: 'Paiement simule avec succes. Votre commande a ete creee sans transaction reelle.',
      });
      await this.router.navigateByUrl('/orders');
    } catch {
      this.notice.set({
        tone: 'error',
        text: "La simulation n'a pas pu finaliser la commande. Verifiez votre panier et reessayez.",
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
