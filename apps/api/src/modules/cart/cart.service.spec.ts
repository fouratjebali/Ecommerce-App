import { CouponType, ProductStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CartService } from './cart.service';
import { CART_UPDATED_EVENT } from '../commerce-events/commerce-events.constants';

describe('CartService', () => {
  const createProduct = (
    overrides: Partial<{
      id: string;
      slug: string;
      name: string;
      studioName: string;
      artisanSlug: string;
      priceInCents: number;
      currency: string;
      impactScore: number;
      co2SavedKg: number;
      inventoryCount: number;
    }> = {},
  ) => ({
    id: overrides.id ?? 'product-1',
    slug: overrides.slug ?? 'product-1',
    name: overrides.name ?? 'Product 1',
    artisan: {
      slug: overrides.artisanSlug ?? 'artisan-1',
      studioName: overrides.studioName ?? 'Studio 1',
    },
    images: [
      {
        url: 'https://example.com/product.jpg',
        alt: 'Product image',
      },
    ],
    materials: [],
    priceInCents: overrides.priceInCents ?? 4000,
    currency: overrides.currency ?? 'USD',
    impactScore: overrides.impactScore ?? 88,
    co2SavedKg: overrides.co2SavedKg ?? 3.2,
    inventoryCount: overrides.inventoryCount ?? 12,
    status: ProductStatus.PUBLISHED,
  });

  const createCoupon = () => ({
    id: 'coupon-1',
    code: 'WELCOME10',
    label: 'Welcome 10%',
    description: 'Seeded welcome discount',
    type: CouponType.PERCENTAGE,
    percentOff: 10,
    amountOffInCents: null,
    minimumSubtotalInCents: 5000,
    maxDiscountInCents: null,
    active: true,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    timesRedeemed: 0,
  });

  it('applies bundle and coupon discounts to a hydrated cart', async () => {
    let storedValue = JSON.stringify({
      couponCode: 'WELCOME10',
      items: [
        { productId: 'product-1', quantity: 1 },
        { productId: 'product-2', quantity: 1 },
        { productId: 'product-3', quantity: 1 },
      ],
      updatedAt: new Date().toISOString(),
    });

    const prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          createProduct({
            id: 'product-1',
            slug: 'bloom-serving-bowl',
            name: 'Bloom Serving Bowl',
            priceInCents: 4000,
          }),
          createProduct({
            id: 'product-2',
            slug: 'cinder-market-tote',
            name: 'Cinder Market Tote',
            priceInCents: 5000,
          }),
          createProduct({
            id: 'product-3',
            slug: 'luna-reed-lamp',
            name: 'Luna Reed Lamp',
            priceInCents: 3000,
          }),
        ]),
        findUnique: jest.fn(),
      },
      coupon: {
        findUnique: jest.fn().mockResolvedValue(createCoupon()),
      },
    };
    const cartStoreService = {
      get: jest.fn(async () => storedValue),
      set: jest.fn(async (_key: string, value: string) => {
        storedValue = value;
      }),
      delete: jest.fn(async () => {
        storedValue = null as never;
      }),
    };
    const inventoryReservationsService = {
      releaseExpiredReservations: jest.fn(),
      getActiveReservations: jest.fn().mockResolvedValue([]),
      syncReservation: jest.fn(),
      releaseReservation: jest.fn(),
      releaseReservationsForSession: jest.fn(),
    };
    const eventEmitter = {
      emit: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string, defaultValue: number) => defaultValue),
    };

    const service = new CartService(
      prisma as never,
      cartStoreService as never,
      inventoryReservationsService as never,
      eventEmitter as EventEmitter2,
      configService as never,
    );

    const cart = await service.getCart('session-123');

    expect(cart.summary.subtotalInCents).toBe(12000);
    expect(cart.summary.bundleDiscountInCents).toBe(960);
    expect(cart.summary.couponDiscountInCents).toBe(1104);
    expect(cart.summary.totalInCents).toBe(9936);
    expect(cart.coupon?.code).toBe('WELCOME10');
  });

  it('adds an item, syncs the reservation, and emits a cart event', async () => {
    let storedValue: string | null = null;

    const prisma = {
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'product-1',
          status: ProductStatus.PUBLISHED,
        }),
        findMany: jest.fn().mockResolvedValue([
          createProduct({
            id: 'product-1',
            slug: 'bloom-serving-bowl',
            name: 'Bloom Serving Bowl',
            priceInCents: 4800,
          }),
        ]),
      },
      coupon: {
        findUnique: jest.fn(),
      },
    };
    const cartStoreService = {
      get: jest.fn(async () => storedValue),
      set: jest.fn(async (_key: string, value: string) => {
        storedValue = value;
      }),
      delete: jest.fn(async () => {
        storedValue = null;
      }),
    };
    const inventoryReservationsService = {
      releaseExpiredReservations: jest.fn(),
      getActiveReservations: jest.fn().mockResolvedValue([
        {
          productId: 'product-1',
          expiresAt: new Date('2026-04-12T12:30:00.000Z'),
        },
      ]),
      syncReservation: jest.fn(),
      releaseReservation: jest.fn(),
      releaseReservationsForSession: jest.fn(),
    };
    const eventEmitter = {
      emit: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string, defaultValue: number) => defaultValue),
    };

    const service = new CartService(
      prisma as never,
      cartStoreService as never,
      inventoryReservationsService as never,
      eventEmitter as EventEmitter2,
      configService as never,
    );

    const cart = await service.addItem('session-123', {
      productId: 'product-1',
      quantity: 2,
    });

    expect(inventoryReservationsService.syncReservation).toHaveBeenCalledWith(
      'session-123',
      'product-1',
      2,
    );
    expect(cart.summary.itemCount).toBe(2);
    expect(cart.summary.totalInCents).toBe(9600);
    expect(eventEmitter.emit).toHaveBeenCalledWith(CART_UPDATED_EVENT, {
      sessionId: 'session-123',
      itemCount: 2,
    });
    expect(cartStoreService.set).toHaveBeenCalled();
  });
});
