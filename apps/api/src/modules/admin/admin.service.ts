import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderItemStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  UserRole,
  VendorStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAdminOrderStatusDto } from './dto/update-admin-order-status.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

const adminUserInclude = {
  artisanProfile: true,
  _count: {
    select: {
      orders: true,
    },
  },
} satisfies Prisma.UserInclude;

const adminOrderInclude = {
  buyer: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  items: {
    select: {
      id: true,
      status: true,
      quantity: true,
      productName: true,
      artisanStudioName: true,
      productId: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.OrderInclude;

const adminProductInclude = {
  artisan: {
    select: {
      id: true,
      studioName: true,
      location: true,
      verificationStatus: true,
      verified: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  images: {
    orderBy: {
      sortOrder: 'asc',
    },
    take: 1,
  },
  _count: {
    select: {
      orderItems: true,
    },
  },
} satisfies Prisma.ProductInclude;

type AdminUserRecord = Prisma.UserGetPayload<{
  include: typeof adminUserInclude;
}>;

type AdminOrderRecord = Prisma.OrderGetPayload<{
  include: typeof adminOrderInclude;
}>;

type AdminProductRecord = Prisma.ProductGetPayload<{
  include: typeof adminProductInclude;
}>;

@Injectable()
export class AdminService {
  private readonly refreshIntervalMs = 30_000;

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const last7Days = this.daysAgo(7);
    const previous7Days = this.daysAgo(14);
    const stalledSince = this.daysAgo(3);

    const [
      orderAggregates,
      totalOrders,
      ordersLast7Days,
      usersCount,
      buyersCount,
      activeArtisans,
      publishedProducts,
      lowStockProducts,
      pendingVendorReviews,
      cancelledOrders,
      statusGroups,
      recentOrders,
      recentUsers,
      categoryOrderItems,
      artisanOrderItems,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          status: {
            not: OrderStatus.CANCELLED,
          },
        },
        _sum: {
          totalInCents: true,
        },
        _avg: {
          totalInCents: true,
        },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({
        where: {
          placedAt: {
            gte: last7Days,
          },
        },
      }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          role: UserRole.BUYER,
        },
      }),
      this.prisma.artisanProfile.count({
        where: {
          verificationStatus: VendorStatus.ACTIVE,
        },
      }),
      this.prisma.product.count({
        where: {
          status: ProductStatus.PUBLISHED,
        },
      }),
      this.prisma.product.findMany({
        where: {
          status: ProductStatus.PUBLISHED,
          inventoryCount: {
            lte: 3,
          },
        },
        select: {
          id: true,
          name: true,
          inventoryCount: true,
          artisan: {
            select: {
              studioName: true,
            },
          },
        },
        orderBy: [
          {
            inventoryCount: 'asc',
          },
          {
            updatedAt: 'desc',
          },
        ],
        take: 4,
      }),
      this.prisma.artisanProfile.findMany({
        where: {
          verificationStatus: VendorStatus.PENDING,
        },
        select: {
          id: true,
          studioName: true,
          location: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 4,
      }),
      this.prisma.order.count({
        where: {
          status: OrderStatus.CANCELLED,
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
      this.prisma.order.findMany({
        include: adminOrderInclude,
        orderBy: {
          placedAt: 'desc',
        },
        take: 6,
      }),
      this.prisma.user.findMany({
        include: adminUserInclude,
        orderBy: {
          createdAt: 'desc',
        },
        take: 6,
      }),
      this.prisma.orderItem.findMany({
        where: {
          order: {
            status: {
              not: OrderStatus.CANCELLED,
            },
          },
        },
        include: {
          product: {
            select: {
              category: {
                select: {
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.orderItem.findMany({
        where: {
          order: {
            status: {
              not: OrderStatus.CANCELLED,
            },
          },
        },
        include: {
          artisan: {
            select: {
              id: true,
              studioName: true,
              location: true,
              verified: true,
            },
          },
        },
      }),
    ]);

    const revenueLast7Days = await this.sumRevenueBetween(last7Days, now);
    const revenuePrevious7Days = await this.sumRevenueBetween(previous7Days, last7Days);

    const stalledOrders = await this.prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.CONFIRMED, OrderStatus.FULFILLING],
        },
        placedAt: {
          lte: stalledSince,
        },
      },
      select: {
        orderNumber: true,
        status: true,
        placedAt: true,
      },
      orderBy: {
        placedAt: 'asc',
      },
      take: 4,
    });

    const alerts = this.buildAlerts(lowStockProducts, pendingVendorReviews, stalledOrders);
    const topCategories = this.buildTopCategories(categoryOrderItems);
    const topArtisans = this.buildTopArtisans(artisanOrderItems);
    const completedOrderCount =
      statusGroups.find((group) => group.status === OrderStatus.COMPLETED)?._count._all ?? 0;

    return {
      generatedAt: now.toISOString(),
      refreshIntervalMs: this.refreshIntervalMs,
      metrics: {
        totalRevenueInCents: orderAggregates._sum.totalInCents ?? 0,
        revenueLast7DaysInCents: revenueLast7Days,
        revenuePrevious7DaysInCents: revenuePrevious7Days,
        totalOrders,
        ordersLast7Days,
        totalUsers: usersCount,
        totalBuyers: buyersCount,
        activeArtisans,
        publishedProducts,
        lowStockProducts: lowStockProducts.length,
        pendingVendorReviews: pendingVendorReviews.length,
        cancelledOrders,
      },
      performance: {
        averageOrderValueInCents: Math.round(orderAggregates._avg.totalInCents ?? 0),
        fulfillmentRate: totalOrders > 0 ? Math.round((completedOrderCount / totalOrders) * 100) : 0,
        statusBreakdown: statusGroups.map((group) => ({
          status: group.status,
          count: group._count._all,
        })),
        topCategories,
        topArtisans,
      },
      alerts,
      recentOrders: recentOrders.map((order) => this.mapAdminOrder(order)),
      recentUsers: recentUsers.map((user) => this.mapAdminUser(user, 0)),
    };
  }

  async listUsers(currentAdmin: AuthenticatedUser) {
    const [users, buyerSpendGroups] = await Promise.all([
      this.prisma.user.findMany({
        include: adminUserInclude,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.groupBy({
        by: ['buyerId'],
        _sum: {
          totalInCents: true,
        },
      }),
    ]);

    const spendMap = new Map(
      buyerSpendGroups.map((group) => [group.buyerId, group._sum.totalInCents ?? 0]),
    );

    return {
      items: users.map((user) =>
        this.mapAdminUser(user, spendMap.get(user.id) ?? 0, currentAdmin.sub),
      ),
    };
  }

  async updateUser(
    currentAdmin: AuthenticatedUser,
    userId: string,
    dto: UpdateAdminUserDto,
  ) {
    if (!dto.role && dto.verificationStatus === undefined && dto.verified === undefined) {
      throw new BadRequestException('No administrator update was provided.');
    }

    if (currentAdmin.sub === userId && dto.role && dto.role !== UserRole.ADMIN) {
      throw new ConflictException('You cannot remove your own administrator access.');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: adminUserInclude,
    });

    if (!currentUser) {
      throw new NotFoundException('User not found.');
    }

    if (dto.role === UserRole.ARTISAN && !currentUser.artisanProfile) {
      throw new BadRequestException('This account cannot become an artisan without an artisan profile.');
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      if (dto.role) {
        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            role: dto.role,
          },
        });
      }

      if (dto.verificationStatus !== undefined || dto.verified !== undefined) {
        if (!currentUser.artisanProfile) {
          throw new BadRequestException('This account does not have an artisan profile to update.');
        }

        const nextVerificationStatus =
          dto.verificationStatus ?? currentUser.artisanProfile.verificationStatus;

        await tx.artisanProfile.update({
          where: {
            id: currentUser.artisanProfile.id,
          },
          data: {
            verificationStatus: nextVerificationStatus,
            verified:
              dto.verified ??
              (nextVerificationStatus === VendorStatus.ACTIVE
                ? true
                : nextVerificationStatus === VendorStatus.SUSPENDED
                  ? false
                  : currentUser.artisanProfile.verified),
          },
        });
      }

      return tx.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        include: adminUserInclude,
      });
    });

    const totalSpent = await this.prisma.order.aggregate({
      where: {
        buyerId: userId,
      },
      _sum: {
        totalInCents: true,
      },
    });

    return {
      user: this.mapAdminUser(
        updatedUser,
        totalSpent._sum.totalInCents ?? 0,
        currentAdmin.sub,
      ),
    };
  }

  async listOrders() {
    const orders = await this.prisma.order.findMany({
      include: adminOrderInclude,
      orderBy: {
        placedAt: 'desc',
      },
    });

    return {
      items: orders.map((order) => this.mapAdminOrder(order)),
    };
  }

  async updateOrderStatus(orderNumber: string, dto: UpdateAdminOrderStatusDto) {
    const existingOrder = await this.prisma.order.findUnique({
      where: {
        orderNumber,
      },
      include: adminOrderInclude,
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found.');
    }

    if (
      dto.status !== OrderStatus.COMPLETED &&
      existingOrder.items.some((item) => item.status === OrderItemStatus.SHIPPED)
    ) {
      throw new ConflictException('A shipped order can only move to a completed state.');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      if (dto.status === OrderStatus.CANCELLED) {
        if (existingOrder.items.some((item) => item.status === OrderItemStatus.SHIPPED)) {
          throw new ConflictException('An order with shipped items cannot be cancelled.');
        }

        for (const item of existingOrder.items.filter((item) => item.status !== OrderItemStatus.CANCELLED)) {
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
            orderId: existingOrder.id,
            status: {
              not: OrderItemStatus.CANCELLED,
            },
          },
          data: {
            status: OrderItemStatus.CANCELLED,
          },
        });
      } else if (dto.status === OrderStatus.COMPLETED) {
        await tx.orderItem.updateMany({
          where: {
            orderId: existingOrder.id,
            status: {
              not: OrderItemStatus.CANCELLED,
            },
          },
          data: {
            status: OrderItemStatus.SHIPPED,
          },
        });
      } else {
        await tx.orderItem.updateMany({
          where: {
            orderId: existingOrder.id,
            status: {
              notIn: [OrderItemStatus.CANCELLED, OrderItemStatus.SHIPPED],
            },
          },
          data: {
            status:
              dto.status === OrderStatus.FULFILLING
                ? OrderItemStatus.FULFILLING
                : OrderItemStatus.CONFIRMED,
          },
        });
      }

      return tx.order.update({
        where: {
          id: existingOrder.id,
        },
        data: {
          status: dto.status,
        },
        include: adminOrderInclude,
      });
    });

    return {
      order: this.mapAdminOrder(updatedOrder),
    };
  }

  async listProducts() {
    const products = await this.prisma.product.findMany({
      include: adminProductInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return {
      items: products.map((product) => this.mapAdminProduct(product)),
    };
  }

  async updateProduct(productId: string, dto: UpdateAdminProductDto) {
    if (dto.status === undefined && dto.isFeatured === undefined) {
      throw new BadRequestException('No product moderation update was provided.');
    }

    const currentProduct = await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: adminProductInclude,
    });

    if (!currentProduct) {
      throw new NotFoundException('Product not found.');
    }

    if (
      dto.isFeatured === true &&
      (dto.status ?? currentProduct.status) !== ProductStatus.PUBLISHED
    ) {
      throw new BadRequestException('Only published products can be featured.');
    }

    const updatedProduct = await this.prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        status: dto.status,
        isFeatured:
          dto.status && dto.status !== ProductStatus.PUBLISHED
            ? false
            : dto.isFeatured,
      },
      include: adminProductInclude,
    });

    return {
      product: this.mapAdminProduct(updatedProduct),
    };
  }

  private async sumRevenueBetween(start: Date, end: Date) {
    const aggregate = await this.prisma.order.aggregate({
      where: {
        status: {
          not: OrderStatus.CANCELLED,
        },
        placedAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: {
        totalInCents: true,
      },
    });

    return aggregate._sum.totalInCents ?? 0;
  }

  private buildAlerts(
    lowStockProducts: Array<{
      id: string;
      name: string;
      inventoryCount: number;
      artisan: { studioName: string };
    }>,
    pendingVendorReviews: Array<{
      id: string;
      studioName: string;
      location: string;
    }>,
    stalledOrders: Array<{
      orderNumber: string;
      status: OrderStatus;
      placedAt: Date;
    }>,
  ) {
    const alerts: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'info';
      title: string;
      message: string;
      count: number;
      actionTarget: 'users' | 'orders' | 'products';
    }> = [];

    if (lowStockProducts.length) {
      alerts.push({
        id: 'low-stock',
        severity: lowStockProducts.some((product) => product.inventoryCount <= 1)
          ? 'critical'
          : 'warning',
        title: 'Stock faible sur des produits publies',
        message: `${lowStockProducts[0].name} chez ${lowStockProducts[0].artisan.studioName} approche de la rupture.`,
        count: lowStockProducts.length,
        actionTarget: 'products',
      });
    }

    if (pendingVendorReviews.length) {
      alerts.push({
        id: 'vendor-review',
        severity: 'warning',
        title: 'Ateliers en attente de verification',
        message: `${pendingVendorReviews[0].studioName} attend encore une validation administrative.`,
        count: pendingVendorReviews.length,
        actionTarget: 'users',
      });
    }

    if (stalledOrders.length) {
      alerts.push({
        id: 'stalled-orders',
        severity: 'info',
        title: 'Commandes sans progression recente',
        message: `${stalledOrders[0].orderNumber} doit etre revue pour relancer la preparation.`,
        count: stalledOrders.length,
        actionTarget: 'orders',
      });
    }

    return alerts;
  }

  private buildTopCategories(
    orderItems: Array<{
      quantity: number;
      lineTotalInCents: number;
      product: {
        category: {
          slug: string;
          name: string;
        };
      };
    }>,
  ) {
    const summary = new Map<
      string,
      { slug: string; name: string; itemsSold: number; revenueInCents: number }
    >();

    for (const item of orderItems) {
      const key = item.product.category.slug;
      const current = summary.get(key) ?? {
        slug: item.product.category.slug,
        name: item.product.category.name,
        itemsSold: 0,
        revenueInCents: 0,
      };

      current.itemsSold += item.quantity;
      current.revenueInCents += item.lineTotalInCents;
      summary.set(key, current);
    }

    return [...summary.values()]
      .sort((left, right) => right.revenueInCents - left.revenueInCents)
      .slice(0, 4);
  }

  private buildTopArtisans(
    orderItems: Array<{
      quantity: number;
      lineTotalInCents: number;
      artisan: {
        id: string;
        studioName: string;
        location: string;
        verified: boolean;
      };
    }>,
  ) {
    const summary = new Map<
      string,
      {
        id: string;
        studioName: string;
        location: string;
        verified: boolean;
        itemsSold: number;
        revenueInCents: number;
      }
    >();

    for (const item of orderItems) {
      const key = item.artisan.id;
      const current = summary.get(key) ?? {
        id: item.artisan.id,
        studioName: item.artisan.studioName,
        location: item.artisan.location,
        verified: item.artisan.verified,
        itemsSold: 0,
        revenueInCents: 0,
      };

      current.itemsSold += item.quantity;
      current.revenueInCents += item.lineTotalInCents;
      summary.set(key, current);
    }

    return [...summary.values()]
      .sort((left, right) => right.revenueInCents - left.revenueInCents)
      .slice(0, 4);
  }

  private mapAdminUser(
    user: AdminUserRecord,
    totalSpentInCents: number,
    currentAdminId?: string,
  ) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      orderCount: user._count.orders,
      totalSpentInCents,
      canManageRole: currentAdminId ? currentAdminId !== user.id : true,
      artisanProfile: user.artisanProfile
        ? {
            id: user.artisanProfile.id,
            slug: user.artisanProfile.slug,
            studioName: user.artisanProfile.studioName,
            verificationStatus: user.artisanProfile.verificationStatus,
            verified: user.artisanProfile.verified,
            location: user.artisanProfile.location,
          }
        : null,
    };
  }

  private mapAdminOrder(order: AdminOrderRecord) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalInCents: order.totalInCents,
      currency: order.currency,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      vendorCount: new Set(order.items.map((item) => item.artisanStudioName)).size,
      placedAt: order.placedAt,
      shippingCity: order.shippingCity,
      shippingCountry: order.shippingCountry,
      buyer: order.buyer,
      items: order.items.map((item) => ({
        id: item.id,
        status: item.status,
        quantity: item.quantity,
        productName: item.productName,
        artisanStudioName: item.artisanStudioName,
      })),
    };
  }

  private mapAdminProduct(product: AdminProductRecord) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      isFeatured: product.isFeatured,
      inventoryCount: product.inventoryCount,
      priceInCents: product.priceInCents,
      currency: product.currency,
      impactScore: product.impactScore,
      updatedAt: product.updatedAt,
      imageUrl: product.images[0]?.url ?? null,
      imageAlt: product.images[0]?.alt ?? product.name,
      orderItemCount: product._count.orderItems,
      artisan: {
        id: product.artisan.id,
        studioName: product.artisan.studioName,
        location: product.artisan.location,
        verificationStatus: product.artisan.verificationStatus,
        verified: product.artisan.verified,
      },
      category: product.category,
    };
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
