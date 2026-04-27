import { Injectable } from '@angular/core';
import { CheckoutPayload } from '../models/orders';

@Injectable({ providedIn: 'root' })
export class CheckoutDraftService {
  private readonly storageKey = 'greencraft.checkout-draft';

  save(payload: CheckoutPayload) {
    sessionStorage.setItem(this.storageKey, JSON.stringify(payload));
  }

  load(): CheckoutPayload | null {
    const rawValue = sessionStorage.getItem(this.storageKey);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as CheckoutPayload;
    } catch {
      this.clear();
      return null;
    }
  }

  clear() {
    sessionStorage.removeItem(this.storageKey);
  }
}
