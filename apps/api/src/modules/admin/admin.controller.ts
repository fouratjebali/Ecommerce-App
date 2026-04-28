import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdminService } from './admin.service';
import { UpdateAdminOrderStatusDto } from './dto/update-admin-order-status.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@ApiTags('Admin')
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get the administrator dashboard snapshot' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users for administrator oversight' })
  listUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.listUsers(user);
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Update an administrator-managed user' })
  updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(user, userId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List orders for administrator oversight' })
  listOrders() {
    return this.adminService.listOrders();
  }

  @Patch('orders/:orderNumber/status')
  @ApiOperation({ summary: 'Update order status from the administrator console' })
  updateOrderStatus(
    @Param('orderNumber') orderNumber: string,
    @Body() dto: UpdateAdminOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatus(orderNumber, dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'List products for administrator oversight' })
  listProducts() {
    return this.adminService.listProducts();
  }

  @Patch('products/:productId')
  @ApiOperation({ summary: 'Update product moderation settings from the administrator console' })
  updateProduct(
    @Param('productId') productId: string,
    @Body() dto: UpdateAdminProductDto,
  ) {
    return this.adminService.updateProduct(productId, dto);
  }
}
