import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { OrdersApiService } from './orders-api.service';
import { CartSessionService } from './cart-session.service';

describe('OrdersApiService', () => {
  let service: OrdersApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrdersApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CartSessionService,
          useValue: {
            getSessionId: () => 'cart-session-123',
          },
        },
      ],
    });

    service = TestBed.inject(OrdersApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('sends the cart session header during checkout', () => {
    service
      .checkout({
        shippingName: 'Buyer Example',
        shippingEmail: 'buyer@example.com',
        shippingAddressLine1: '12 Eco Street',
        shippingCity: 'Casablanca',
        shippingPostalCode: '20000',
        shippingCountry: 'Morocco',
      })
      .subscribe();

    const request = httpTesting.expectOne('/api/v1/orders/checkout');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('x-cart-session')).toBe('cart-session-123');

    request.flush({
      order: {
        id: 'order-1',
        orderNumber: 'GC-20260412-1001',
      },
    });
  });

  it('targets the buyer cancellation endpoint for an order number', () => {
    service.cancelBuyerOrder('GC-20260412-1001').subscribe();

    const request = httpTesting.expectOne('/api/v1/orders/GC-20260412-1001/cancel');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});

    request.flush({
      order: {
        id: 'order-1',
        orderNumber: 'GC-20260412-1001',
      },
    });
  });
});
