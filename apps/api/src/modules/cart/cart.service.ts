import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CouponType, Prisma, ProductStatus } from '@prisma/client';
import type { AppEnvironment } from '../../config/environment';
import { CART_UPDATED_EVENT } from '../commerce-events/commerce-events.constants';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {
  CartCouponSummary,
  CartResponse,
  CartResponseItem,
  CartSessionRecord,
  CheckoutCartSnapshot,
} from './cart.types';
import { CartStoreService } from './cart-store.service';
import { InventoryReservationsService } from './inventory-reservations.service';

const cartProductInclude = {
  artisan: true,
  images: {
    orderBy: {
      sortOrder: 'asc',
    },
  },
  materials: {
    include: {
      materialTag: true,
    },
  },
} satisfies Prisma.ProductInclude;

type CartProductRecord = Prisma.ProductGetPayload<{
  include: typeof cartProductInclude;
}>;

@Injectable()
export class CartService {
  private readonly cartSessionTtlHours: number;
  private readonly bundleDiscountPercent: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartStoreService: CartStoreService,
    private readonly inventoryReservationsService: InventoryReservationsService,
    private readonly eventEmitter: EventEmitter2,
    configService: ConfigService<AppEnvironment>,
  ) {
    this.cartSessionTtlHours = configService.get('CART_SESSION_TTL_HOURS', 72);
    this.bundleDiscountPercent = configService.get(
      'BUNDLE_DISCOUNT_PERCENT',
      8,
    );
  }

  async getCart(sessionId: string) {
    this.assertSessionId(sessionId);
    const cart = await this.loadCart(sessionId);
    return this.buildSnapshot(sessionId, cart);
  }

  async addItem(sessionId: string, dto: AddCartItemDto) {
    this.assertSessionId(sessionId);
    await this.assertPublishedProduct(dto.productId);

    const cart = await this.loadCart(sessionId);
    const currentItem = cart.items.find((item) => item.productId === dto.productId);
    const nextQuantity = (currentItem?.quantity ?? 0) + dto.quantity;

    await this.inventoryReservationsService.syncReservation(
      sessionId,
      dto.productId,
      nextQuantity,
    );

    const nextItems = currentItem
      ? cart.items.map((item) =>
          item.productId === dto.productId
            ? { ...item, quantity: nextQuantity }
            : item,
        )
      : [...cart.items, { productId: dto.productId, quantity: dto.quantity }];

    await this.persistCart(sessionId, {
      ...cart,
      items: nextItems,
    });

    return this.emitCartAndReturn(sessionId);
  }

  async updateItemQuantity(
    sessionId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ) {
    this.assertSessionId(sessionId);
    const cart = await this.loadCart(sessionId);
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (!existingItem) {
      throw new NotFoundException('Cart item not found.');
    }

    if (dto.quantity === 0) {
      return this.removeItem(sessionId, productId);
    }

    await this.assertPublishedProduct(productId);
    await this.inventoryReservationsService.syncReservation(
      sessionId,
      productId,
      dto.quantity,
    );

    await this.persistCart(sessionId, {
      ...cart,
      items: cart.items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: dto.quantity,
            }
          : item,
      ),
    });

    return this.emitCartAndReturn(sessionId);
  }

  async removeItem(sessionId: string, productId: string) {
    this.assertSessionId(sessionId);
    const cart = await this.loadCart(sessionId);

    await this.inventoryReservationsService.releaseReservation(
      sessionId,
      productId,
    );

    await this.persistCart(sessionId, {
      ...cart,
      items: cart.items.filter((item) => item.productId !== productId),
    });

    return this.emitCartAndReturn(sessionId);
  }

  async applyCoupon(sessionId: string, dto: ApplyCouponDto) {
    this.assertSessionId(sessionId);
    const cart = await this.loadCart(sessionId);
    const code = dto.code.trim().toUpperCase();
    const preview = await this.buildSnapshot(sessionId, {
      ...cart,
      couponCode: code,
    });

    if (!preview.coupon) {
      throw new BadRequestException(
        'This coupon is invalid for the current cart.',
      );
    }

    await this.persistCart(sessionId, {
      ...cart,
      couponCode: code,
    });

    return this.emitCartAndReturn(sessionId);
  }

  async clearCoupon(sessionId: string) {
    this.assertSessionId(sessionId);
    const cart = await this.loadCart(sessionId);

    await this.persistCart(sessionId, {
      ...cart,
      couponCode: null,
    });

    return this.emitCartAndReturn(sessionId);
  }

  async clearCart(sessionId: string) {
    this.assertSessionId(sessionId);
    await this.inventoryReservationsService.releaseReservationsForSession(
      sessionId,
    );
    await this.cartStoreService.delete(this.buildCartKey(sessionId));

    return this.emptyCart(sessionId);
  }

  async getCheckoutSnapshot(sessionId: string): Promise<CheckoutCartSnapshot> {
    this.assertSessionId(sessionId);
    const cart = await this.loadCart(sessionId);
    return this.buildSnapshot(sessionId, cart);
  }

  private async emitCartAndReturn(sessionId: string) {
    const snapshot = await this.getCart(sessionId);

    this.eventEmitter.emit(CART_UPDATED_EVENT, {
      sessionId,
      itemCount: snapshot.summary.itemCount,
    });

    return snapshot;
  }

  private async buildSnapshot(
    sessionId: string,
    rawCart: CartSessionRecord,
  ): Promise<CheckoutCartSnapshot> {
    if (!rawCart.items.length) {
      return {
        ...this.emptyCart(sessionId),
        couponForOrder: null,
      };
    }

    await this.inventoryReservationsService.releaseExpiredReservations();

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: rawCart.items.map((item) => item.productId),
        },
        status: ProductStatus.PUBLISHED,
      },
      include: cartProductInclude,
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const invalidProductIds = rawCart.items
      .filter((item) => !productMap.has(item.productId))
      .map((item) => item.productId);

    let cart = rawCart;

    if (invalidProductIds.length) {
      for (const productId of invalidProductIds) {
        await this.inventoryReservationsService.releaseReservation(
          sessionId,
          productId,
        );
      }

      cart = {
        ...rawCart,
        items: rawCart.items.filter(
          (item) => !invalidProductIds.includes(item.productId),
        ),
      };

      await this.persistCart(sessionId, cart);
    }

    if (!cart.items.length) {
      return {
        ...this.emptyCart(sessionId),
        couponForOrder: null,
      };
    }

    const reservations =
      await this.inventoryReservationsService.getActiveReservations(
        sessionId,
        cart.items.map((item) => item.productId),
      );
    const reservationMap = new Map(
      reservations.map((reservation) => [reservation.productId, reservation]),
    );

    const items = cart.items.flatMap((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        return [];
      }

      return [
        this.mapCartResponseItem(
          product,
          item.quantity,
          reservationMap.get(item.productId)?.expiresAt ?? null,
        ),
      ];
    });

    const subtotalInCents = items.reduce(
      (sum, item) => sum + item.lineTotalInCents,
      0,
    );
    const bundleEligible = items.length >= 3;
    const bundleDiscountInCents = bundleEligible
      ? Math.round((subtotalInCents * this.bundleDiscountPercent) / 100)
      : 0;

    const couponBaseInCents = Math.max(
      subtotalInCents - bundleDiscountInCents,
      0,
    );
    const couponResolution = await this.resolveCoupon(
      cart.couponCode,
      couponBaseInCents,
    );
    const totalCo2SavedKg = Number(
      items
        .reduce((sum, item) => sum + item.co2SavedKg * item.quantity, 0)
        .toFixed(1),
    );

    return {
      sessionId,
      items,
      coupon: couponResolution.summary,
      couponForOrder: couponResolution.orderCoupon,
      summary: {
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        distinctItems: items.length,
        subtotalInCents,
        couponDiscountInCents: couponResolution.discountInCents,
        bundleDiscountInCents,
        totalInCents: Math.max(
          couponBaseInCents - couponResolution.discountInCents,
          0,
        ),
        totalCo2SavedKg,
        bundleEligible,
        bundleDiscountPercent: this.bundleDiscountPercent,
      },
    };
  }

  private mapCartResponseItem(
    product: CartProductRecord,
    quantity: number,
    reservationExpiresAt: Date | null,
  ): CartResponseItem {
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      artisan: {
        slug: product.artisan.slug,
        studioName: product.artisan.studioName,
      },
      imageUrl: product.images[0]?.url ?? null,
      imageAlt: product.images[0]?.alt ?? product.name,
      price: {
        amountInCents: product.priceInCents,
        currency: product.currency,
      },
      quantity,
      lineTotalInCents: product.priceInCents * quantity,
      impactScore: product.impactScore,
      co2SavedKg: product.co2SavedKg,
      inventoryCount: product.inventoryCount,
      reservationExpiresAt: reservationExpiresAt?.toISOString() ?? null,
    };
  }

  private async resolveCoupon(
    code: string | null,
    discountBaseInCents: number,
  ): Promise<{
    summary: CartCouponSummary | null;
    orderCoupon: { id: string; code: string } | null;
    discountInCents: number;
  }> {
    if (!code) {
      return {
        summary: null,
        orderCoupon: null,
        discountInCents: 0,
      };
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: {
        code,
      },
    });

    if (!coupon || !coupon.active) {
      return {
        summary: null,
        orderCoupon: null,
        discountInCents: 0,
      };
    }

    const now = new Date();

    if (
      (coupon.startsAt && coupon.startsAt > now) ||
      (coupon.endsAt && coupon.endsAt < now) ||
      discountBaseInCents < coupon.minimumSubtotalInCents ||
      (coupon.usageLimit !== null && coupon.timesRedeemed >= coupon.usageLimit)
    ) {
      return {
        summary: null,
        orderCoupon: null,
        discountInCents: 0,
      };
    }

    const rawDiscount =
      coupon.type === CouponType.PERCENTAGE
        ? Math.round(
            (discountBaseInCents * Math.max(coupon.percentOff ?? 0, 0)) / 100,
          )
        : Math.max(coupon.amountOffInCents ?? 0, 0);
    const cappedDiscount = Math.min(
      rawDiscount,
      coupon.maxDiscountInCents ?? rawDiscount,
      discountBaseInCents,
    );

    return {
      summary: {
        id: coupon.id,
        code: coupon.code,
        label: coupon.label,
        description: coupon.description,
        discountInCents: cappedDiscount,
      },
      orderCoupon: {
        id: coupon.id,
        code: coupon.code,
      },
      discountInCents: cappedDiscount,
    };
  }

  private async assertPublishedProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('This product cannot be added to the cart.');
    }
  }

  private async loadCart(sessionId: string): Promise<CartSessionRecord> {
    const rawValue = await this.cartStoreService.get(this.buildCartKey(sessionId));

    if (!rawValue) {
      return this.createEmptyCartRecord();
    }

    try {
      const parsed = JSON.parse(rawValue) as Partial<CartSessionRecord>;

      return {
        couponCode: parsed.couponCode ?? null,
        items: Array.isArray(parsed.items)
          ? parsed.items.filter(
              (item): item is { productId: string; quantity: number } =>
                Boolean(item?.productId) &&
                typeof item.quantity === 'number' &&
                item.quantity > 0,
            )
          : [],
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      };
    } catch {
      return this.createEmptyCartRecord();
    }
  }

  private async persistCart(sessionId: string, cart: CartSessionRecord) {
    const normalizedCart: CartSessionRecord = {
      couponCode: cart.couponCode,
      items: cart.items.filter((item) => item.quantity > 0),
      updatedAt: new Date().toISOString(),
    };

    if (!normalizedCart.items.length && !normalizedCart.couponCode) {
      await this.cartStoreService.delete(this.buildCartKey(sessionId));
      return;
    }

    await this.cartStoreService.set(
      this.buildCartKey(sessionId),
      JSON.stringify(normalizedCart),
      this.cartSessionTtlHours * 60 * 60,
    );
  }

  private emptyCart(sessionId: string): CartResponse {
    return {
      sessionId,
      items: [],
      coupon: null,
      summary: {
        itemCount: 0,
        distinctItems: 0,
        subtotalInCents: 0,
        couponDiscountInCents: 0,
        bundleDiscountInCents: 0,
        totalInCents: 0,
        totalCo2SavedKg: 0,
        bundleEligible: false,
        bundleDiscountPercent: this.bundleDiscountPercent,
      },
    };
  }

  private createEmptyCartRecord(): CartSessionRecord {
    return {
      couponCode: null,
      items: [],
      updatedAt: new Date().toISOString(),
    };
  }

  private buildCartKey(sessionId: string) {
    return `greencraft:cart:${sessionId}`;
  }

  private assertSessionId(sessionId: string | undefined): asserts sessionId is string {
    if (!sessionId?.trim()) {
      throw new BadRequestException(
        'The x-cart-session header is required for cart operations.',
      );
    }
  }
}
