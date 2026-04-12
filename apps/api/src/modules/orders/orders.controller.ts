import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('vendor/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List vendor order items for the authenticated artisan',
  })
  listVendorOrderItems(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listVendorOrderItems(user);
  }

  @Patch('vendor/items/:itemId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ARTISAN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update vendor order item status for the authenticated artisan',
  })
  updateVendorOrderItemStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemStatusDto,
  ) {
    return this.ordersService.updateVendorOrderItemStatus(user, itemId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List orders belonging to the authenticated buyer' })
  listBuyerOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listBuyerOrders(user);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Convert the current cart into a buyer order' })
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-cart-session') sessionId: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(user, sessionId, dto);
  }

  @Post(':orderNumber/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a buyer order before shipment' })
  cancelBuyerOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.cancelBuyerOrder(user, orderNumber);
  }

  @Get(':orderNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a buyer order by order number' })
  getBuyerOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.getBuyerOrder(user, orderNumber);
  }
}
