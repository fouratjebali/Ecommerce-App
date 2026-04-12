import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  OrderItemStatus,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { randomInt } from 'node:crypto';
import {
  ORDER_CANCELLED_EVENT,
  ORDER_CREATED_EVENT,
  ORDER_ITEM_STATUS_UPDATED_EVENT,
} from '../commerce-events/commerce-events.constants';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CartService } from '../cart/cart.service';
import { InventoryReservationsService } from '../cart/inventory-reservations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';

const buyerOrderInclude = {
  coupon: true,
  items: {
    include: {
      product: {
        select: {
          slug: true,
        },
      },
      artisan: {
        select: {
          slug: true,
          studioName: true,
          location: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.OrderInclude;

type BuyerOrderRecord = Prisma.OrderGetPayload<{
  include: typeof buyerOrderInclude;
}>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly inventoryReservationsService: InventoryReservationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async checkout(
    user: AuthenticatedUser,
    sessionId: string,
    dto: CheckoutDto,
  ) {
    this.requireBuyer(user);

    const snapshot = await this.cartService.getCheckoutSnapshot(sessionId);

    if (!snapshot.items.length) {
      throw new BadRequestException('The cart is empty.');
    }

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      for (const item of snapshot.items) {
        await this.inventoryReservationsService.syncReservation(
          sessionId,
          item.productId,
          item.quantity,
          tx,
        );
      }

      const products = await tx.product.findMany({
        where: {
          id: {
            in: snapshot.items.map((item) => item.productId),
          },
        },
        select: {
          id: true,
          artisanId: true,
          artisan: {
            select: {
              studioName: true,
            },
          },
        },
      });
      const productMap = new Map(products.map((product) => [product.id, product]));

      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          buyerId: user.sub,
          couponId: snapshot.couponForOrder?.id,
          cartSessionId: sessionId,
          status: OrderStatus.CONFIRMED,
          currency: snapshot.items[0]?.price.currency ?? 'USD',
          subtotalInCents: snapshot.summary.subtotalInCents,
          couponDiscountInCents: snapshot.summary.couponDiscountInCents,
          bundleDiscountInCents: snapshot.summary.bundleDiscountInCents,
          totalInCents: snapshot.summary.totalInCents,
          shippingName: dto.shippingName.trim(),
          shippingEmail: dto.shippingEmail.trim(),
          shippingAddressLine1: dto.shippingAddressLine1.trim(),
          shippingAddressLine2: dto.shippingAddressLine2?.trim(),
          shippingCity: dto.shippingCity.trim(),
          shippingPostalCode: dto.shippingPostalCode.trim(),
          shippingCountry: dto.shippingCountry.trim(),
          notes: dto.notes?.trim(),
          items: {
            create: snapshot.items.map((item) => {
              const product = productMap.get(item.productId);

              if (!product) {
                throw new NotFoundException(
                  `Product ${item.productId} could not be checked out.`,
                );
              }

              return {
                productId: item.productId,
                artisanId: product.artisanId,
                status: OrderItemStatus.CONFIRMED,
                productName: item.name,
                artisanStudioName: product.artisan.studioName,
                unitPriceInCents: item.price.amountInCents,
                quantity: item.quantity,
                lineTotalInCents: item.lineTotalInCents,
                impactScore: item.impactScore,
                co2SavedKg: item.co2SavedKg,
                currency: item.price.currency,
              };
            }),
          },
        },
        include: buyerOrderInclude,
      });

      for (const item of snapshot.items) {
        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            inventoryCount: {
              decrement: item.quantity,
            },
          },
        });
      }

      await this.inventoryReservationsService.consumeReservations(
        sessionId,
        order.id,
        tx,
      );

      if (snapshot.couponForOrder?.id) {
        await tx.coupon.update({
          where: {
            id: snapshot.couponForOrder.id,
          },
          data: {
            timesRedeemed: {
              increment: 1,
            },
          },
        });
      }

      return order;
    });

    await this.cartService.clearCart(sessionId);

    this.eventEmitter.emit(ORDER_CREATED_EVENT, {
      orderNumber: createdOrder.orderNumber,
      buyerId: user.sub,
      totalInCents: createdOrder.totalInCents,
    });

    return {
      order: this.mapBuyerOrder(createdOrder),
    };
  }

  async listBuyerOrders(user: AuthenticatedUser) {
    this.requireBuyer(user);

    const orders = await this.prisma.order.findMany({
      where: {
        buyerId: user.sub,
      },
      include: buyerOrderInclude,
      orderBy: {
        placedAt: 'desc',
      },
    });

    return {
      items: orders.map((order) => this.mapBuyerOrder(order)),
    };
  }

  async getBuyerOrder(user: AuthenticatedUser, orderNumber: string) {
    this.requireBuyer(user);

    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber,
        buyerId: user.sub,
      },
      include: buyerOrderInclude,
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return {
      order: this.mapBuyerOrder(order),
    };
  }

  async cancelBuyerOrder(user: AuthenticatedUser, orderNumber: string) {
    this.requireBuyer(user);

    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber,
        buyerId: user.sub,
      },
      include: buyerOrderInclude,
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.items.some((item) => item.status === OrderItemStatus.SHIPPED)) {
      throw new ConflictException(
        'Shipped items cannot be cancelled from the buyer portal.',
      );
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const restockableItems = order.items.filter(
        (item) => item.status !== OrderItemStatus.CANCELLED,
      );

      for (const item of restockableItems) {
        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            inventoryCount: {
              increment: item.quantity,
            },
          },
        });
      }

      await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
          status: {
            not: OrderItemStatus.CANCELLED,
          },
        },
        data: {
          status: OrderItemStatus.CANCELLED,
        },
      });

      return tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.CANCELLED,
        },
        include: buyerOrderInclude,
      });
    });

    this.eventEmitter.emit(ORDER_CANCELLED_EVENT, {
      orderNumber: updatedOrder.orderNumber,
      buyerId: user.sub,
    });

    return {
      order: this.mapBuyerOrder(updatedOrder),
    };
  }

  async listVendorOrderItems(user: AuthenticatedUser) {
    const artisanId = this.requireArtisan(user);

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        artisanId,
      },
      include: {
        product: {
          select: {
            slug: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            status: true,
            placedAt: true,
            shippingCity: true,
            shippingCountry: true,
            buyer: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      items: orderItems.map((item) => ({
        id: item.id,
        orderNumber: item.order.orderNumber,
        orderStatus: item.order.status,
        itemStatus: item.status,
        placedAt: item.order.placedAt,
        buyer: item.order.buyer,
        shippingCity: item.order.shippingCity,
        shippingCountry: item.order.shippingCountry,
        productName: item.productName,
        productSlug: item.product.slug,
        quantity: item.quantity,
        lineTotalInCents: item.lineTotalInCents,
        currency: item.currency,
      })),
    };
  }

  async updateVendorOrderItemStatus(
    user: AuthenticatedUser,
    itemId: string,
    dto: UpdateOrderItemStatusDto,
  ) {
    const artisanId = this.requireArtisan(user);

    const orderItem = await this.prisma.orderItem.findUnique({
      where: {
        id: itemId,
      },
      include: {
        order: true,
      },
    });

    if (!orderItem || orderItem.artisanId !== artisanId) {
      throw new NotFoundException('Order item not found for this artisan.');
    }

    if (
      orderItem.status === OrderItemStatus.SHIPPED &&
      dto.status !== OrderItemStatus.SHIPPED
    ) {
      throw new ConflictException(
        'A shipped order item cannot move back to an earlier state.',
      );
    }

    const updatedItem = await this.prisma.$transaction(async (tx) => {
      const nextItem = await tx.orderItem.update({
        where: {
          id: itemId,
        },
        data: {
          status: dto.status,
        },
      });

      if (
        dto.status === OrderItemStatus.CANCELLED &&
        orderItem.status !== OrderItemStatus.CANCELLED
      ) {
        await tx.product.update({
          where: {
            id: orderItem.productId,
          },
          data: {
            inventoryCount: {
              increment: orderItem.quantity,
            },
          },
        });
      }

      const siblingStatuses = await tx.orderItem.findMany({
        where: {
          orderId: orderItem.orderId,
        },
        select: {
          status: true,
        },
      });
      const nextOrderStatus = this.resolveOrderStatusFromItems(
        siblingStatuses.map((item) => item.status),
      );

      await tx.order.update({
        where: {
          id: orderItem.orderId,
        },
        data: {
          status: nextOrderStatus,
        },
      });

      return nextItem;
    });

    this.eventEmitter.emit(ORDER_ITEM_STATUS_UPDATED_EVENT, {
      orderNumber: orderItem.order.orderNumber,
      itemId,
      status: updatedItem.status,
    });

    return {
      item: {
        id: updatedItem.id,
        status: updatedItem.status,
      },
    };
  }

  private mapBuyerOrder(order: BuyerOrderRecord) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      currency: order.currency,
      subtotalInCents: order.subtotalInCents,
      couponDiscountInCents: order.couponDiscountInCents,
      bundleDiscountInCents: order.bundleDiscountInCents,
      totalInCents: order.totalInCents,
      placedAt: order.placedAt,
      shipping: {
        name: order.shippingName,
        email: order.shippingEmail,
        addressLine1: order.shippingAddressLine1,
        addressLine2: order.shippingAddressLine2,
        city: order.shippingCity,
        postalCode: order.shippingPostalCode,
        country: order.shippingCountry,
      },
      coupon: order.coupon
        ? {
            code: order.coupon.code,
            label: order.coupon.label,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        productSlug: item.product.slug,
        artisanStudioName: item.artisanStudioName,
        artisanSlug: item.artisan.slug,
        artisanLocation: item.artisan.location,
        status: item.status,
        quantity: item.quantity,
        unitPriceInCents: item.unitPriceInCents,
        lineTotalInCents: item.lineTotalInCents,
        impactScore: item.impactScore,
        co2SavedKg: item.co2SavedKg,
        currency: item.currency,
      })),
    };
  }

  private requireBuyer(user: AuthenticatedUser) {
    if (user.role !== UserRole.BUYER) {
      throw new ForbiddenException('Only buyers can access order checkout.');
    }
  }

  private requireArtisan(user: AuthenticatedUser) {
    if (!user.artisanProfileId) {
      throw new ForbiddenException(
        'Only artisans can access vendor order management.',
      );
    }

    return user.artisanProfileId;
  }

  private resolveOrderStatusFromItems(statuses: OrderItemStatus[]) {
    if (statuses.every((status) => status === OrderItemStatus.CANCELLED)) {
      return OrderStatus.CANCELLED;
    }

    if (statuses.every((status) => status === OrderItemStatus.SHIPPED)) {
      return OrderStatus.COMPLETED;
    }

    if (
      statuses.some(
        (status) =>
          status === OrderItemStatus.FULFILLING ||
          status === OrderItemStatus.SHIPPED,
      )
    ) {
      return OrderStatus.FULFILLING;
    }

    return OrderStatus.CONFIRMED;
  }

  private generateOrderNumber() {
    const now = new Date();
    const datePart = `${now.getUTCFullYear()}${String(
      now.getUTCMonth() + 1,
    ).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    return `GC-${datePart}-${randomInt(1000, 9999)}`;
  }
}
