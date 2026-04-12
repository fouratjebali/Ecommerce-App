import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartSessionService {
  private readonly storageKey = 'greencraft.cart-session';

  getSessionId() {
    let sessionId = localStorage.getItem(this.storageKey);

    if (!sessionId) {
      sessionId =
        globalThis.crypto?.randomUUID?.() ??
        `cart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(this.storageKey, sessionId);
    }

    return sessionId;
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }
}
