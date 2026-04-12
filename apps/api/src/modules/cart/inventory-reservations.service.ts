import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InventoryReservationStatus,
  Prisma,
  ProductStatus,
} from '@prisma/client';
import type { AppEnvironment } from '../../config/environment';
import { PrismaService } from '../prisma/prisma.service';

type ReservationClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class InventoryReservationsService {
  private readonly reservationWindowMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService<AppEnvironment>,
  ) {
    this.reservationWindowMinutes = configService.get(
      'CART_RESERVATION_TTL_MINUTES',
      30,
    );
  }

  async syncReservation(
    sessionId: string,
    productId: string,
    quantity: number,
    client: ReservationClient = this.prisma,
  ) {
    if (!sessionId.trim()) {
      throw new BadRequestException('A cart session id is required.');
    }

    if (quantity <= 0) {
      await this.releaseReservation(sessionId, productId, client);
      return null;
    }

    const now = new Date();
    await this.releaseExpiredReservations(productId, client, now);

    const [product, currentReservation, reservedByOthers] = await Promise.all([
      client.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          status: true,
          inventoryCount: true,
        },
      }),
      client.inventoryReservation.findFirst({
        where: {
          sessionId,
          productId,
          status: InventoryReservationStatus.ACTIVE,
          expiresAt: {
            gt: now,
          },
        },
      }),
      client.inventoryReservation.aggregate({
        where: {
          productId,
          status: InventoryReservationStatus.ACTIVE,
          expiresAt: {
            gt: now,
          },
          NOT: {
            sessionId,
          },
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    if (product.status !== ProductStatus.PUBLISHED) {
      throw new ConflictException(
        'Only published products can be reserved in the cart.',
      );
    }

    const availableInventory =
      product.inventoryCount - (reservedByOthers._sum.quantity ?? 0);

    if (quantity > availableInventory) {
      throw new ConflictException(
        `Only ${Math.max(availableInventory, 0)} units of ${product.name} are currently available.`,
      );
    }

    const expiresAt = new Date(
      now.getTime() + this.reservationWindowMinutes * 60 * 1000,
    );

    if (currentReservation) {
      return client.inventoryReservation.update({
        where: { id: currentReservation.id },
        data: {
          quantity,
          expiresAt,
        },
      });
    }

    return client.inventoryReservation.create({
      data: {
        sessionId,
        productId,
        quantity,
        expiresAt,
      },
    });
  }

  async getActiveReservations(
    sessionId: string,
    productIds: string[],
    client: ReservationClient = this.prisma,
  ) {
    if (!productIds.length) {
      return [];
    }

    const now = new Date();
    await this.releaseExpiredReservations(undefined, client, now);

    return client.inventoryReservation.findMany({
      where: {
        sessionId,
        productId: {
          in: productIds,
        },
        status: InventoryReservationStatus.ACTIVE,
        expiresAt: {
          gt: now,
        },
      },
    });
  }

  async releaseReservation(
    sessionId: string,
    productId: string,
    client: ReservationClient = this.prisma,
  ) {
    return client.inventoryReservation.updateMany({
      where: {
        sessionId,
        productId,
        status: InventoryReservationStatus.ACTIVE,
      },
      data: {
        status: InventoryReservationStatus.RELEASED,
      },
    });
  }

  async releaseReservationsForSession(
    sessionId: string,
    client: ReservationClient = this.prisma,
  ) {
    return client.inventoryReservation.updateMany({
      where: {
        sessionId,
        status: InventoryReservationStatus.ACTIVE,
      },
      data: {
        status: InventoryReservationStatus.RELEASED,
      },
    });
  }

  async consumeReservations(
    sessionId: string,
    orderId: string,
    client: ReservationClient = this.prisma,
  ) {
    return client.inventoryReservation.updateMany({
      where: {
        sessionId,
        status: InventoryReservationStatus.ACTIVE,
      },
      data: {
        status: InventoryReservationStatus.CONSUMED,
        orderId,
      },
    });
  }

  async releaseExpiredReservations(
    productId?: string,
    client: ReservationClient = this.prisma,
    now = new Date(),
  ) {
    return client.inventoryReservation.updateMany({
      where: {
        ...(productId
          ? {
              productId,
            }
          : {}),
        status: InventoryReservationStatus.ACTIVE,
        expiresAt: {
          lte: now,
        },
      },
      data: {
        status: InventoryReservationStatus.EXPIRED,
      },
    });
  }
}
