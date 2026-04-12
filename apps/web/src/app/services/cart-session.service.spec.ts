import { TestBed } from '@angular/core/testing';
import { CartSessionService } from './cart-session.service';

describe('CartSessionService', () => {
  let service: CartSessionService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(CartSessionService);
  });

  it('creates and persists a session id when one does not exist', () => {
    const firstSessionId = service.getSessionId();
    const secondSessionId = service.getSessionId();

    expect(firstSessionId).toBeTruthy();
    expect(secondSessionId).toBe(firstSessionId);
    expect(localStorage.getItem('greencraft.cart-session')).toBe(firstSessionId);
  });

  it('clears the stored cart session', () => {
    service.getSessionId();

    service.clear();

    expect(localStorage.getItem('greencraft.cart-session')).toBeNull();
  });
});
