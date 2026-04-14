import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderItemStatus, OrderStatus, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import {
  ORDER_CANCELLED_EVENT,
  ORDER_CREATED_EVENT,
} from '../commerce-events/commerce-events.constants';

describe('OrdersService', () => {
  const buyerUser = {
    sub: 'buyer-1',
    email: 'buyer@greencraft.local',
    fullName: 'Jordan Lee',
    role: UserRole.BUYER,
    artisanProfileId: null,
    artisanSlug: null,
  };

  const checkoutSnapshot = {
    sessionId: 'session-123',
    items: [
      {
        productId: 'product-1',
        slug: 'bloom-serving-bowl',
        name: 'Bloom Serving Bowl',
        artisan: {
          slug: 'noura-clay-studio',
          studioName: 'Noura Clay Studio',
        },
        imageUrl: null,
        imageAlt: 'Bowl',
        price: {
          amountInCents: 5800,
          currency: 'TND',
        },
        quantity: 1,
        lineTotalInCents: 5800,
        impactScore: 95,
        co2SavedKg: 5.6,
        inventoryCount: 10,
        reservationExpiresAt: null,
      },
      {
        productId: 'product-2',
        slug: 'cinder-market-tote',
        name: 'Cinder Market Tote',
        artisan: {
          slug: 'atelier-olive',
          studioName: 'Atelier Olive',
        },
        imageUrl: null,
        imageAlt: 'Tote',
        price: {
          amountInCents: 7200,
          currency: 'TND',
        },
        quantity: 1,
        lineTotalInCents: 7200,
        impactScore: 91,
        co2SavedKg: 3.8,
        inventoryCount: 8,
        reservationExpiresAt: null,
      },
    ],
    coupon: {
      id: 'coupon-1',
      code: 'WELCOME10',
      label: 'Welcome 10%',
      description: 'Seeded welcome discount',
      discountInCents: 1300,
    },
    couponForOrder: {
      id: 'coupon-1',
      code: 'WELCOME10',
    },
    summary: {
      itemCount: 2,
      distinctItems: 2,
      subtotalInCents: 13000,
      couponDiscountInCents: 1300,
      bundleDiscountInCents: 0,
      totalInCents: 11700,
      totalCo2SavedKg: 9.4,
      bundleEligible: false,
      bundleDiscountPercent: 8,
    },
  };

  const createdOrder = {
    id: 'order-1',
    orderNumber: 'GC-20260412-1200',
    status: OrderStatus.CONFIRMED,
    currency: 'TND',
    subtotalInCents: 13000,
    couponDiscountInCents: 1300,
    bundleDiscountInCents: 0,
    totalInCents: 11700,
    placedAt: new Date('2026-04-12T12:00:00.000Z'),
    shippingName: 'Jordan Lee',
    shippingEmail: 'buyer@greencraft.local',
    shippingAddressLine1: '18 Palm Court',
    shippingAddressLine2: null,
    shippingCity: 'Tunis',
    shippingPostalCode: '1000',
    shippingCountry: 'Tunisia',
    coupon: {
      code: 'WELCOME10',
      label: 'Welcome 10%',
    },
    items: [
      {
        id: 'order-item-1',
        productName: 'Bloom Serving Bowl',
        artisanStudioName: 'Noura Clay Studio',
        status: OrderItemStatus.CONFIRMED,
        quantity: 1,
        unitPriceInCents: 5800,
        lineTotalInCents: 5800,
        impactScore: 95,
        co2SavedKg: 5.6,
        currency: 'TND',
        product: {
          slug: 'bloom-serving-bowl',
        },
        artisan: {
          slug: 'noura-clay-studio',
          studioName: 'Noura Clay Studio',
          location: 'Nabeul, Tunisia',
        },
      },
      {
        id: 'order-item-2',
        productName: 'Cinder Market Tote',
        artisanStudioName: 'Atelier Olive',
        status: OrderItemStatus.CONFIRMED,
        quantity: 1,
        unitPriceInCents: 7200,
        lineTotalInCents: 7200,
        impactScore: 91,
        co2SavedKg: 3.8,
        currency: 'TND',
        product: {
          slug: 'cinder-market-tote',
        },
        artisan: {
          slug: 'atelier-olive',
          studioName: 'Atelier Olive',
          location: 'Sousse, Tunisia',
        },
      },
    ],
  };

  it('checks out the cart and emits an order created event', async () => {
    const transactionClient = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'product-1',
            artisanId: 'artisan-1',
            artisan: {
              studioName: 'Noura Clay Studio',
            },
          },
          {
            id: 'product-2',
            artisanId: 'artisan-2',
            artisan: {
              studioName: 'Atelier Olive',
            },
          },
        ]),
        update: jest.fn(),
      },
      order: {
        create: jest.fn().mockResolvedValue(createdOrder),
      },
      coupon: {
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };
    const cartService = {
      getCheckoutSnapshot: jest.fn().mockResolvedValue(checkoutSnapshot),
      clearCart: jest.fn(),
    };
    const inventoryReservationsService = {
      syncReservation: jest.fn(),
      consumeReservations: jest.fn(),
    };
    const eventEmitter = {
      emit: jest.fn(),
    };

    const service = new OrdersService(
      prisma as never,
      cartService as never,
      inventoryReservationsService as never,
      eventEmitter as EventEmitter2,
    );

    const result = await service.checkout(buyerUser as never, 'session-123', {
      shippingName: 'Jordan Lee',
      shippingEmail: 'buyer@greencraft.local',
      shippingAddressLine1: '18 Palm Court',
      shippingCity: 'Tunis',
      shippingPostalCode: '1000',
      shippingCountry: 'Tunisia',
    });

    expect(cartService.clearCart).toHaveBeenCalledWith('session-123');
    expect(
      inventoryReservationsService.consumeReservations,
    ).toHaveBeenCalledWith('session-123', 'order-1', transactionClient);
    expect(result.order.totalInCents).toBe(11700);
    expect(eventEmitter.emit).toHaveBeenCalledWith(ORDER_CREATED_EVENT, {
      orderNumber: 'GC-20260412-1200',
      buyerId: 'buyer-1',
      totalInCents: 11700,
    });
  });

  it('cancels a buyer order, restocks inventory, and emits a cancellation event', async () => {
    const cancellableOrder = {
      ...createdOrder,
      items: createdOrder.items.map((item) => ({
        ...item,
        status: OrderItemStatus.CONFIRMED,
        productId: item.id === 'order-item-1' ? 'product-1' : 'product-2',
      })),
    };
    const updatedOrder = {
      ...createdOrder,
      status: OrderStatus.CANCELLED,
      items: createdOrder.items.map((item) => ({
        ...item,
        status: OrderItemStatus.CANCELLED,
        productId: item.id === 'order-item-1' ? 'product-1' : 'product-2',
      })),
    };
    const transactionClient = {
      product: {
        update: jest.fn(),
      },
      orderItem: {
        updateMany: jest.fn(),
      },
      order: {
        update: jest.fn().mockResolvedValue(updatedOrder),
      },
    };
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue(cancellableOrder),
      },
      $transaction: jest.fn(
        async (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };
    const cartService = {
      getCheckoutSnapshot: jest.fn(),
      clearCart: jest.fn(),
    };
    const inventoryReservationsService = {
      syncReservation: jest.fn(),
      consumeReservations: jest.fn(),
    };
    const eventEmitter = {
      emit: jest.fn(),
    };

    const service = new OrdersService(
      prisma as never,
      cartService as never,
      inventoryReservationsService as never,
      eventEmitter as EventEmitter2,
    );

    const result = await service.cancelBuyerOrder(
      buyerUser as never,
      'GC-20260412-1200',
    );

    expect(transactionClient.product.update).toHaveBeenCalledTimes(2);
    expect(result.order.status).toBe(OrderStatus.CANCELLED);
    expect(eventEmitter.emit).toHaveBeenCalledWith(ORDER_CANCELLED_EVENT, {
      orderNumber: 'GC-20260412-1200',
      buyerId: 'buyer-1',
    });
  });
});
